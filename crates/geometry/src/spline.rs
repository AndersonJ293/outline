use crate::entities::{Point, SplineControlPoint};

pub fn evaluate_bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: f64) -> Point {
    let u = 1.0 - t;
    let uu = u * u;
    let uuu = uu * u;
    let tt = t * t;
    let ttt = tt * t;
    Point {
        x: uuu * p0.x + 3.0 * uu * t * p1.x + 3.0 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3.0 * uu * t * p1.y + 3.0 * u * tt * p2.y + ttt * p3.y,
    }
}

pub fn sample_spline(
    control_points: &[SplineControlPoint],
    steps: u32,
    closed: bool,
) -> Vec<Point> {
    if control_points.is_empty() {
        return vec![];
    }
    let safe_steps = steps.max(1);
    let n = control_points.len();
    if n == 1 {
        return vec![control_points[0].point];
    }

    let mut result: Vec<Point> = Vec::new();
    let span_count = if closed { n } else { n.saturating_sub(1) };
    if span_count == 0 {
        return vec![control_points[0].point];
    }

    for i in 0..span_count {
        let curr = &control_points[i];
        let next = &control_points[(i + 1) % n];
        let p1 = Point {
            x: curr.point.x + curr.handle_out.dx,
            y: curr.point.y + curr.handle_out.dy,
        };
        let p2 = Point {
            x: next.point.x - next.handle_out.dx,
            y: next.point.y - next.handle_out.dy,
        };
        let start = if i == 0 { 0 } else { 1 };
        let is_last = i == span_count - 1;
        let end = if is_last && closed {
            safe_steps - 1
        } else {
            safe_steps
        };
        if end < start {
            continue;
        }
        for s in start..=end {
            let t = s as f64 / safe_steps as f64;
            result.push(evaluate_bezier(curr.point, p1, p2, next.point, t));
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    #[test]
    fn test_evaluate_bezier_endpoints() {
        let p0 = p(0.0, 0.0);
        let p3 = p(10.0, 10.0);
        let r0 = evaluate_bezier(p0, p(3.0, 0.0), p(7.0, 10.0), p3, 0.0);
        assert!((r0.x - 0.0).abs() < 0.001);
        assert!((r0.y - 0.0).abs() < 0.001);
        let r1 = evaluate_bezier(p0, p(3.0, 0.0), p(7.0, 10.0), p3, 1.0);
        assert!((r1.x - 10.0).abs() < 0.001);
        assert!((r1.y - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_sample_spline_open() {
        let cp = vec![
            SplineControlPoint {
                point: p(0.0, 0.0),
                handle_out: crate::entities::SplineHandle { dx: 3.0, dy: 0.0 },
            },
            SplineControlPoint {
                point: p(10.0, 0.0),
                handle_out: crate::entities::SplineHandle { dx: -3.0, dy: 0.0 },
            },
        ];
        let pts = sample_spline(&cp, 8, false);
        assert_eq!(pts.len(), 9);
        assert!((pts[0].x - 0.0).abs() < 0.001);
        assert!((pts[8].x - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_sample_spline_closed() {
        let cp = vec![
            SplineControlPoint {
                point: p(0.0, 0.0),
                handle_out: crate::entities::SplineHandle { dx: 3.0, dy: 0.0 },
            },
            SplineControlPoint {
                point: p(10.0, 0.0),
                handle_out: crate::entities::SplineHandle { dx: 0.0, dy: 3.0 },
            },
            SplineControlPoint {
                point: p(10.0, 10.0),
                handle_out: crate::entities::SplineHandle { dx: -3.0, dy: 0.0 },
            },
            SplineControlPoint {
                point: p(0.0, 10.0),
                handle_out: crate::entities::SplineHandle { dx: 0.0, dy: -3.0 },
            },
        ];
        let pts = sample_spline(&cp, 4, true);
        assert!(!pts.is_empty());
        // closed: first and last should be somewhat close in a looped curve
        let dx = pts[0].x - pts[pts.len() - 1].x;
        let dy = pts[0].y - pts[pts.len() - 1].y;
        // Rough tolerance for a reasonable closed Bezier curve
        assert!((dx * dx + dy * dy).sqrt() < 20.0);
    }

    #[test]
    fn test_sample_spline_single_point() {
        let cp = vec![SplineControlPoint {
            point: p(5.0, 5.0),
            handle_out: crate::entities::SplineHandle { dx: 0.0, dy: 0.0 },
        }];
        let pts = sample_spline(&cp, 8, false);
        assert_eq!(pts.len(), 1);
        assert!((pts[0].x - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_sample_spline_empty() {
        let pts = sample_spline(&[], 8, false);
        assert!(pts.is_empty());
    }
}
