use crate::entities::Point;

pub fn polygon_signed_area(points: &[Point]) -> f64 {
    let mut area = 0.0;
    for i in 0..points.len() {
        let j = (i + 1) % points.len();
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    area / 2.0
}

fn normalize(x: f64, y: f64) -> (f64, f64) {
    let len = (x * x + y * y).sqrt();
    if len < 1e-12 {
        return (0.0, 0.0);
    }
    (x / len, y / len)
}

fn dot(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    ax * bx + ay * by
}

fn left_normal(dx: f64, dy: f64) -> (f64, f64) {
    (-dy, dx)
}

pub fn compute_offset(points: &[Point], offset_distance: f64) -> Option<Vec<Point>> {
    if points.len() < 3 {
        return None;
    }
    let n = points.len();
    let mut result = Vec::with_capacity(n);

    for i in 0..n {
        let prev = &points[(i + n - 1) % n];
        let curr = &points[i];
        let next = &points[(i + 1) % n];

        let in_dx = curr.x - prev.x;
        let in_dy = curr.y - prev.y;
        let out_dx = next.x - curr.x;
        let out_dy = next.y - curr.y;

        let (n1x, n1y) = normalize(left_normal(in_dx, in_dy).0, left_normal(in_dx, in_dy).1);
        let (n2x, n2y) = normalize(left_normal(out_dx, out_dy).0, left_normal(out_dx, out_dy).1);

        let bisector_x = n1x + n2x;
        let bisector_y = n1y + n2y;
        let (bix, biy) = normalize(bisector_x, bisector_y);

        let cos_half = dot(bix, biy, n1x, n1y);
        if cos_half.abs() < 1e-12 {
            return None;
        }

        let scale = offset_distance / cos_half;
        result.push(Point {
            x: curr.x + bix * scale,
            y: curr.y + biy * scale,
        });
    }

    Some(result)
}

/// Offsets an *open* polyline by `offset_distance` to its left (CCW normal).
/// Endpoints use the adjacent segment normal; interior vertices use the
/// miter bisector. Unlike [`compute_offset`], the path is not treated as a
/// closed loop, so the first and last points are not connected.
pub fn compute_open_offset(points: &[Point], offset_distance: f64) -> Option<Vec<Point>> {
    let n = points.len();
    if n < 2 {
        return None;
    }
    let mut result = Vec::with_capacity(n);

    for i in 0..n {
        if i == 0 {
            let (lx, ly) = left_normal(points[1].x - points[0].x, points[1].y - points[0].y);
            let (nx, ny) = normalize(lx, ly);
            result.push(Point {
                x: points[0].x + nx * offset_distance,
                y: points[0].y + ny * offset_distance,
            });
        } else if i == n - 1 {
            let (lx, ly) = left_normal(
                points[n - 1].x - points[n - 2].x,
                points[n - 1].y - points[n - 2].y,
            );
            let (nx, ny) = normalize(lx, ly);
            result.push(Point {
                x: points[i].x + nx * offset_distance,
                y: points[i].y + ny * offset_distance,
            });
        } else {
            let (i1x, i1y) =
                left_normal(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
            let (n1x, n1y) = normalize(i1x, i1y);
            let (i2x, i2y) =
                left_normal(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            let (n2x, n2y) = normalize(i2x, i2y);
            let (bix, biy) = normalize(n1x + n2x, n1y + n2y);
            let cos_half = dot(bix, biy, n1x, n1y);
            let scale = if cos_half.abs() < 1e-6 {
                offset_distance
            } else {
                offset_distance / cos_half
            };
            result.push(Point {
                x: points[i].x + bix * scale,
                y: points[i].y + biy * scale,
            });
        }
    }

    Some(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    #[test]
    fn test_signed_area_ccw() {
        let pts = vec![p(0.0, 0.0), p(10.0, 0.0), p(10.0, 10.0), p(0.0, 10.0)];
        let area = polygon_signed_area(&pts);
        assert!((area - 100.0).abs() < 1e-10);
    }

    #[test]
    fn test_signed_area_cw() {
        let pts = vec![p(0.0, 0.0), p(0.0, 10.0), p(10.0, 10.0), p(10.0, 0.0)];
        let area = polygon_signed_area(&pts);
        assert!((area + 100.0).abs() < 1e-10);
    }

    #[test]
    fn test_offset_rectangle_outward() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let area = polygon_signed_area(&pts);
        let offset_dist = if area > 0.0 { -1.2 } else { 1.2 };
        let result = compute_offset(&pts, offset_dist).unwrap();
        assert_eq!(result.len(), 4);
        assert!(result[0].x < 0.0);
        assert!(result[0].y < 0.0);
        assert!(result[2].x > 40.0);
        assert!(result[2].y > 40.0);
    }

    #[test]
    fn test_offset_rectangle_inward() {
        let pts = vec![p(0.0, 0.0), p(40.0, 0.0), p(40.0, 40.0), p(0.0, 40.0)];
        let area = polygon_signed_area(&pts);
        let offset_dist = if area > 0.0 { 1.2 } else { -1.2 };
        let result = compute_offset(&pts, offset_dist).unwrap();
        assert_eq!(result.len(), 4);
        assert!(result[0].x > 0.0);
        assert!(result[0].y > 0.0);
        assert!(result[2].x < 40.0);
        assert!(result[2].y < 40.0);
    }

    #[test]
    fn test_offset_thin_inside_invalid() {
        let pts = vec![p(0.0, 0.0), p(2.0, 0.0), p(2.0, 2.0), p(0.0, 2.0)];
        let result = compute_offset(&pts, 1.5);
        assert!(result.is_some());
    }
}
