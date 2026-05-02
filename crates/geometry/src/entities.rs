use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub points: Vec<Point>,
    pub closed: bool,
}

/// Valida se a entidade forma um contorno fechado simples
pub fn is_closed(entity: &Entity) -> bool {
    entity.closed && entity.points.len() >= 3
}

/// Calcula a bounding box de um contorno
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
