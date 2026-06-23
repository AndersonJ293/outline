use crate::entities::Point;
use crate::offset::{compute_offset, polygon_signed_area};

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

/// Generates a solid extrusion: bottom cap + top cap + side walls.
/// No offset, no hollow interior — used for `OperationKind::Extrude`.
pub fn generate_extrude_mesh(points: &[Point], height: f64) -> Option<MeshData> {
    if points.len() < 3 || height <= 0.0 {
        return None;
    }
    Some(build_solid_mesh(points, height))
}

fn build_solid_mesh(points: &[Point], height: f64) -> MeshData {
    let n = points.len();
    let mut vertices = Vec::with_capacity(2 * n);
    let mut triangles = Vec::with_capacity(2 * n + 2 * n);

    for p in points {
        vertices.push([p.x, p.y, 0.0]);
    }
    for p in points {
        vertices.push([p.x, p.y, height]);
    }

    let b = |i: u32| i;
    let t = |i: u32| (n as u32) + i;
    let j = |i: usize| ((i + 1) % n) as u32;

    // Top cap (CCW when viewed from +Z)
    for i in 0..n {
        let ni = i as u32;
        let nj = j(i);
        triangles.push([t(ni), t(nj), b(ni)]);
        triangles.push([b(ni), t(nj), b(nj)]);
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
