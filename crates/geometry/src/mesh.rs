use crate::entities::Point;
use crate::offset::{compute_offset, compute_open_offset, polygon_signed_area};

pub struct MeshData {
    pub vertices: Vec<[f64; 3]>,
    pub triangles: Vec<[u32; 3]>,
}

pub fn generate_wall_mesh(
    points: &[Point],
    height: f64,
    thickness: f64,
    side: &str,
) -> Option<MeshData> {
    if points.len() < 3 || height <= 0.0 || thickness <= 0.0 {
        return None;
    }

    let signed_area = polygon_signed_area(points);
    let ccw = signed_area > 0.0;

    let (inner_pts, outer_pts) = match side {
        "inside" => {
            let inward = if ccw { thickness } else { -thickness };
            (compute_offset(points, inward)?, points.to_vec())
        }
        "outside" => {
            let outward = if ccw { -thickness } else { thickness };
            (points.to_vec(), compute_offset(points, outward)?)
        }
        _ => {
            let half = thickness / 2.0;
            let inward = if ccw { half } else { -half };
            let outward = if ccw { -half } else { half };
            let inner = compute_offset(points, inward)?;
            let outer = compute_offset(points, outward)?;
            (inner, outer)
        }
    };

    if inner_pts.len() != outer_pts.len() || inner_pts.len() < 3 {
        return None;
    }

    Some(build_wall_mesh(&inner_pts, &outer_pts, height))
}

/// Generates a thin wall swept along an *open* polyline (a "fence").
/// The cross-section is a rectangle `thickness` wide by `height` tall, centered
/// on the path. Used for `OperationKind::ExtrudeThin` when the profile is not a
/// closed contour — mirrors Fusion's thin extrude of a single open line.
pub fn generate_open_wall_mesh(points: &[Point], height: f64, thickness: f64) -> Option<MeshData> {
    if points.len() < 2 || height <= 0.0 || thickness <= 0.0 {
        return None;
    }
    let half = thickness / 2.0;
    let left = compute_open_offset(points, half)?;
    let right = compute_open_offset(points, -half)?;
    if left.len() != right.len() || left.len() < 2 {
        return None;
    }
    Some(build_open_wall_mesh(&left, &right, height))
}

fn build_open_wall_mesh(left: &[Point], right: &[Point], height: f64) -> MeshData {
    let n = left.len();
    let mut vertices = Vec::with_capacity(4 * n);
    // left bottom, right bottom, left top, right top
    for p in left.iter().take(n) {
        vertices.push([p.x, p.y, 0.0]);
    }
    for p in right.iter().take(n) {
        vertices.push([p.x, p.y, 0.0]);
    }
    for p in left.iter().take(n) {
        vertices.push([p.x, p.y, height]);
    }
    for p in right.iter().take(n) {
        vertices.push([p.x, p.y, height]);
    }

    let lb = |i: u32| i;
    let rb = |i: u32| (n as u32) + i;
    let lt = |i: u32| (2 * n as u32) + i;
    let rt = |i: u32| (3 * n as u32) + i;

    let mut triangles = Vec::with_capacity((n - 1) * 8 + 4);

    for i in 0..(n - 1) {
        let a = i as u32;
        let b = (i + 1) as u32;

        // top face
        triangles.push([lt(a), rt(a), lt(b)]);
        triangles.push([lt(b), rt(a), rt(b)]);
        // bottom face
        triangles.push([lb(a), lb(b), rb(a)]);
        triangles.push([rb(a), lb(b), rb(b)]);
        // left side wall
        triangles.push([lb(a), lt(a), lb(b)]);
        triangles.push([lb(b), lt(a), lt(b)]);
        // right side wall
        triangles.push([rb(a), rb(b), rt(a)]);
        triangles.push([rt(a), rb(b), rt(b)]);
    }

    // end caps
    let last = (n - 1) as u32;
    triangles.push([lb(0), rb(0), lt(0)]);
    triangles.push([lt(0), rb(0), rt(0)]);
    triangles.push([lb(last), lt(last), rb(last)]);
    triangles.push([rb(last), lt(last), rt(last)]);

    MeshData {
        vertices,
        triangles,
    }
}

/// Generates a solid extrusion: bottom cap + top cap + side walls.
/// No offset, no hollow interior — used for `OperationKind::Extrude`.
pub fn generate_extrude_mesh(points: &[Point], height: f64) -> Option<MeshData> {
    if points.len() < 3 || height <= 0.0 {
        return None;
    }
    Some(build_solid_mesh(points, height))
}

pub fn generate_profile_extrude_mesh(
    outer: &[Point],
    inner: Option<&[Point]>,
    height: f64,
) -> Option<MeshData> {
    if outer.len() < 3 || height <= 0.0 {
        return None;
    }
    match inner {
        Some(inner_pts) => {
            if inner_pts.len() != outer.len() || inner_pts.len() < 3 {
                return None;
            }
            Some(build_wall_mesh(inner_pts, outer, height))
        }
        None => Some(build_solid_mesh(outer, height)),
    }
}

/// Ear-clipping triangulation of a simple (non-self-intersecting) 2D
/// polygon. Handles convex and concave outlines alike; winding of the
/// returned triangles matches the input polygon's own winding.
fn triangulate_polygon(points: &[Point]) -> Vec<[u32; 3]> {
    let n = points.len();
    if n < 3 {
        return Vec::new();
    }
    let ccw = polygon_signed_area(points) > 0.0;

    let is_convex_corner = |a: Point, b: Point, c: Point| -> bool {
        let cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if ccw {
            cross > 0.0
        } else {
            cross < 0.0
        }
    };

    let point_in_triangle = |p: Point, a: Point, b: Point, c: Point| -> bool {
        let d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
        let d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
        let d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
        let has_neg = d1 < 0.0 || d2 < 0.0 || d3 < 0.0;
        let has_pos = d1 > 0.0 || d2 > 0.0 || d3 > 0.0;
        !(has_neg && has_pos)
    };

    let mut indices: Vec<usize> = (0..n).collect();
    let mut triangles = Vec::with_capacity(n.saturating_sub(2));
    let mut guard = 0;

    while indices.len() > 2 {
        guard += 1;
        if guard > n * n + 8 {
            break; // Degenerate/self-intersecting input: stop rather than loop forever.
        }
        let m = indices.len();
        let mut clipped = false;
        for i in 0..m {
            let prev = indices[(i + m - 1) % m];
            let cur = indices[i];
            let next = indices[(i + 1) % m];
            let (a, b, c) = (points[prev], points[cur], points[next]);
            if !is_convex_corner(a, b, c) {
                continue;
            }
            let contains_other = indices.iter().any(|&idx| {
                idx != prev && idx != cur && idx != next && point_in_triangle(points[idx], a, b, c)
            });
            if contains_other {
                continue;
            }
            triangles.push([prev as u32, cur as u32, next as u32]);
            indices.remove(i);
            clipped = true;
            break;
        }
        if !clipped {
            // No valid ear found (degenerate input) — fan the remainder
            // rather than looping forever.
            let first = indices[0];
            for w in 1..indices.len() - 1 {
                triangles.push([first as u32, indices[w] as u32, indices[w + 1] as u32]);
            }
            break;
        }
    }
    triangles
}

fn build_solid_mesh(points: &[Point], height: f64) -> MeshData {
    let n = points.len();
    let mut vertices = Vec::with_capacity(2 * n);

    for p in points {
        vertices.push([p.x, p.y, 0.0]);
    }
    for p in points {
        vertices.push([p.x, p.y, height]);
    }

    let b = |i: u32| i;
    let t = |i: u32| (n as u32) + i;
    let j = |i: usize| ((i + 1) % n) as u32;

    let cap_tris = triangulate_polygon(points);
    let mut triangles = Vec::with_capacity(2 * cap_tris.len() + 2 * n);

    for tri in &cap_tris {
        // Bottom cap faces -Z, so its winding is reversed relative to the
        // polygon's own (top-facing) orientation.
        triangles.push([b(tri[0]), b(tri[2]), b(tri[1])]);
        triangles.push([t(tri[0]), t(tri[1]), t(tri[2])]);
    }

    // Side walls
    for i in 0..n {
        let ni = i as u32;
        let nj = j(i);
        triangles.push([b(ni), b(nj), t(ni)]);
        triangles.push([t(ni), b(nj), t(nj)]);
    }

    MeshData {
        vertices,
        triangles,
    }
}

fn build_wall_mesh(inner: &[Point], outer: &[Point], height: f64) -> MeshData {
    let n = inner.len();
    let mut vertices = Vec::with_capacity(4 * n);
    let mut triangles = Vec::with_capacity(4 * 2 * n);

    for point in outer.iter().take(n) {
        vertices.push([point.x, point.y, 0.0]);
    }
    for point in inner.iter().take(n) {
        vertices.push([point.x, point.y, 0.0]);
    }
    for point in outer.iter().take(n) {
        vertices.push([point.x, point.y, height]);
    }
    for point in inner.iter().take(n) {
        vertices.push([point.x, point.y, height]);
    }

    let ob = |i: u32| i;
    let ib = |i: u32| (n as u32) + i;
    let ot = |i: u32| (2 * n as u32) + i;
    let it = |i: u32| (3 * n as u32) + i;

    let j = |i: usize| ((i + 1) % n) as u32;
    let i_u32 = |i: usize| i as u32;

    for i in 0..n {
        let ni = i_u32(i);
        let nj = j(i);

        triangles.push([ob(ni), ob(nj), ib(ni)]);
        triangles.push([ib(ni), ob(nj), ib(nj)]);

        triangles.push([ot(ni), it(ni), ot(nj)]);
        triangles.push([it(ni), it(nj), ot(nj)]);

        triangles.push([ob(ni), ot(ni), ob(nj)]);
        triangles.push([ob(nj), ot(ni), ot(nj)]);

        triangles.push([ib(ni), ib(nj), it(nj)]);
        triangles.push([ib(ni), it(nj), it(ni)]);
    }

    MeshData {
        vertices,
        triangles,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    #[test]
    fn test_wall_mesh_rectangle_center() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let mesh = generate_wall_mesh(&pts, 15.0, 1.2, "center").unwrap();
        assert_eq!(mesh.vertices.len(), 4 * 4);
        assert_eq!(mesh.triangles.len(), 4 * 2 * 4);
    }

    #[test]
    fn test_profile_extrude_ring() {
        let outer = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let inner = vec![p(5.0, 5.0), p(35.0, 5.0), p(35.0, 35.0), p(5.0, 35.0)];
        let mesh = generate_profile_extrude_mesh(&outer, Some(&inner), 2.0).unwrap();
        assert_eq!(mesh.vertices.len(), 16);
        assert_eq!(mesh.triangles.len(), 32);
    }

    #[test]
    fn test_profile_extrude_solid() {
        let outer = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let mesh = generate_profile_extrude_mesh(&outer, None, 2.0).unwrap();
        assert_eq!(mesh.vertices.len(), 8);
        // 2 side-wall triangles per edge (8) + 2 cap triangles per end (4).
        assert_eq!(mesh.triangles.len(), 12);
    }

    #[test]
    fn test_solid_mesh_has_capped_ends() {
        // A capped extrusion of a rectangle must be watertight: every edge
        // shared by exactly two triangles. An uncapped tube leaves the top
        // and bottom rim edges with only one adjacent triangle.
        let outer = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let mesh = generate_extrude_mesh(&outer, 2.0).unwrap();

        use std::collections::HashMap;
        let mut edge_counts: HashMap<(u32, u32), u32> = HashMap::new();
        for tri in &mesh.triangles {
            for k in 0..3 {
                let a = tri[k];
                let b = tri[(k + 1) % 3];
                let key = if a < b { (a, b) } else { (b, a) };
                *edge_counts.entry(key).or_insert(0) += 1;
            }
        }
        assert!(edge_counts.values().all(|&count| count == 2));
    }

    #[test]
    fn test_wall_mesh_rectangle_outside() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let mesh = generate_wall_mesh(&pts, 15.0, 1.2, "outside").unwrap();
        assert_eq!(mesh.vertices.len(), 4 * 4);
        assert!(mesh.vertices[0][0] < 0.0);
    }

    #[test]
    fn test_wall_mesh_rectangle_inside() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let mesh = generate_wall_mesh(&pts, 15.0, 1.2, "inside").unwrap();
        assert_eq!(mesh.vertices.len(), 4 * 4);
        // outer = original (points[0] = {0,0}), inner = offset inward (x > 0)
        assert_eq!(mesh.vertices[0][0], 0.0);
        assert!(mesh.vertices[4][0] > 0.0);
    }

    #[test]
    fn test_wall_mesh_triangle() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0), p(20.0, 40.0)];
        let mesh = generate_wall_mesh(&pts, 15.0, 1.2, "center").unwrap();
        assert_eq!(mesh.vertices.len(), 4 * 3);
        assert_eq!(mesh.triangles.len(), 4 * 2 * 3);
    }

    #[test]
    fn test_wall_mesh_invalid_params() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0)];
        assert!(generate_wall_mesh(&pts, 15.0, 1.2, "center").is_none());

        let pts2 = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0)];
        assert!(generate_wall_mesh(&pts2, 0.0, 1.2, "center").is_none());
        assert!(generate_wall_mesh(&pts2, 15.0, 0.0, "center").is_none());
    }
}
