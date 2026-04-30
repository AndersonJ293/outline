use crate::entities::{Entity, bounding_box};

/// Gera offset simples: expande a bounding box pela espessura.
/// Futuramente: offset real de curvas.
pub fn generate_offset_wall(
    entity: &Entity,
    thickness: f64,
    side: &str, // "inside" | "outside" | "center"
) -> Option<(f64, f64, f64, f64)> {
    let (min_x, min_y, max_x, max_y) = bounding_box(entity)?;

    match side {
        "inside" => {
            let half = thickness / 2.0;
            Some((min_x + half, min_y + half, max_x - half, max_y - half))
        }
        "outside" => {
            Some((min_x - thickness, min_y - thickness, max_x + thickness, max_y + thickness))
        }
        _ => {
            // center
            let half = thickness / 2.0;
            Some((min_x - half, min_y - half, max_x + half, max_y + half))
        }
    }
}
