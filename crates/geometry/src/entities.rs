use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplineHandle {
    pub dx: f64,
    pub dy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplineControlPoint {
    pub point: Point,
    #[serde(rename = "handleOut")]
    pub handle_out: SplineHandle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub points: Vec<Point>,
    pub closed: bool,
    #[serde(
        default,
        rename = "controlPoints",
        skip_serializing_if = "Option::is_none"
    )]
    pub control_points: Option<Vec<SplineControlPoint>>,
    #[serde(
        default,
        rename = "samplingSteps",
        skip_serializing_if = "Option::is_none"
    )]
    pub sampling_steps: Option<u32>,
}

/// Checks whether the entity forms a simple closed profile
pub fn is_closed(entity: &Entity) -> bool {
    entity.closed && entity.points.len() >= 3
}

/// Computes the bounding box of a profile
pub fn bounding_box(entity: &Entity) -> Option<(f64, f64, f64, f64)> {
    if entity.points.is_empty() {
        return None;
    }
    let min_x = entity
        .points
        .iter()
        .map(|p| p.x)
        .fold(f64::INFINITY, f64::min);
    let max_x = entity
        .points
        .iter()
        .map(|p| p.x)
        .fold(f64::NEG_INFINITY, f64::max);
    let min_y = entity
        .points
        .iter()
        .map(|p| p.y)
        .fold(f64::INFINITY, f64::min);
    let max_y = entity
        .points
        .iter()
        .map(|p| p.y)
        .fold(f64::NEG_INFINITY, f64::max);
    Some((min_x, min_y, max_x, max_y))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    #[test]
    fn backward_compat_legacy_polyline() {
        let json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":10,"y":0}],"closed":false}"#;
        let entity: Entity = serde_json::from_str(json).unwrap();
        assert_eq!(entity.id, "e1");
        assert_eq!(entity.entity_type, "polyline");
        assert!(entity.control_points.is_none());
        assert!(entity.sampling_steps.is_none());
    }

    #[test]
    fn spline_round_trip() {
        let entity = Entity {
            id: "s1".to_string(),
            entity_type: "spline".to_string(),
            points: vec![p(0.0, 0.0), p(5.0, 5.0), p(10.0, 0.0)],
            closed: false,
            control_points: Some(vec![
                SplineControlPoint {
                    point: p(0.0, 0.0),
                    handle_out: SplineHandle { dx: 2.0, dy: 0.0 },
                },
                SplineControlPoint {
                    point: p(5.0, 5.0),
                    handle_out: SplineHandle { dx: 2.0, dy: 0.0 },
                },
            ]),
            sampling_steps: Some(64),
        };
        let serialized = serde_json::to_string(&entity).unwrap();
        assert!(serialized.contains("\"type\":\"spline\""));
        assert!(serialized.contains("\"controlPoints\""));
        assert!(serialized.contains("\"handleOut\""));
        let back: Entity = serde_json::from_str(&serialized).unwrap();
        assert_eq!(back.control_points.as_ref().unwrap().len(), 2);
        assert_eq!(back.sampling_steps, Some(64));
    }

    #[test]
    fn spline_omits_optional_fields_when_none() {
        let entity = Entity {
            id: "e1".to_string(),
            entity_type: "polyline".to_string(),
            points: vec![p(0.0, 0.0), p(10.0, 0.0)],
            closed: false,
            control_points: None,
            sampling_steps: None,
        };
        let serialized = serde_json::to_string(&entity).unwrap();
        assert!(!serialized.contains("controlPoints"));
        assert!(!serialized.contains("samplingSteps"));
    }
}
