use crate::project::{Entity, Mesh, Operation};
use geometry::entities as geo_entities;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommandResult<T> {
    pub ok: bool,
    pub value: Option<T>,
    pub error: Option<CommandError>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl<T> CommandResult<T> {
    pub fn ok(value: T) -> Self {
        Self {
            ok: true,
            value: Some(value),
            error: None,
        }
    }

    pub fn err(code: &str, message: &str) -> Self {
        Self {
            ok: false,
            value: None,
            error: Some(CommandError {
                code: code.to_string(),
                message: message.to_string(),
            }),
        }
    }
}

pub fn validate_closed_profile(entity: &Entity) -> CommandResult<bool> {
    if !entity.closed {
        return CommandResult::err(
            "PROFILE_NOT_CLOSED",
            "O contorno precisa estar fechado para gerar um cortador.",
        );
    }
    if entity.points.len() < 3 {
        return CommandResult::err(
            "PROFILE_TOO_SMALL",
            "O contorno precisa de pelo menos 3 pontos.",
        );
    }
    CommandResult::ok(true)
}

/// Gera malha de parede para cortador usando offset 2D real + extrusão.
/// Suporta offset interno, externo e centralizado.
pub fn generate_wall_mesh(entity: &Entity, operation: &Operation) -> CommandResult<Mesh> {
    let validation = validate_closed_profile(entity);
    if !validation.ok {
        return CommandResult::err(
            &validation.error.as_ref().unwrap().code,
            &validation.error.as_ref().unwrap().message,
        );
    }

    let geo_points: Vec<geo_entities::Point> = entity
        .points
        .iter()
        .map(|p| geo_entities::Point { x: p.x, y: p.y })
        .collect();

    let result = geometry::mesh::generate_wall_mesh(
        &geo_points,
        operation.height_mm,
        operation.wall_thickness_mm,
        &operation.offset_side,
    );

    match result {
        Some(mesh_data) => CommandResult::ok(Mesh {
            id: format!("mesh_{}", operation.id),
            vertices: mesh_data.vertices,
            triangles: mesh_data.triangles,
        }),
        None => CommandResult::err(
            "MESH_GENERATION_FAILED",
            "Não foi possível gerar a malha. Verifique o contorno e os parâmetros.",
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entity_contract_with_type_field() {
        let json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":10,"y":0},{"x":10,"y":10}],"closed":true}"#;
        let entity: Entity = serde_json::from_str(json).unwrap();
        assert_eq!(entity.id, "e1");
        assert_eq!(entity.entity_type, "polyline");
        assert_eq!(entity.points.len(), 3);

        let serialized = serde_json::to_string(&entity).unwrap();
        assert!(serialized.contains(r#""type":"polyline""#));
        assert!(!serialized.contains("entity_type"));
    }

    #[test]
    fn test_operation_contract_with_type_field() {
        let json = r#"{"id":"op1","type":"cookie_cutter_wall","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let op: Operation = serde_json::from_str(json).unwrap();
        assert_eq!(op.id, "op1");
        assert_eq!(op.op_type, "cookie_cutter_wall");

        let serialized = serde_json::to_string(&op).unwrap();
        assert!(serialized.contains(r#""type":"cookie_cutter_wall""#));
        assert!(!serialized.contains("op_type"));
    }

    #[test]
    fn test_wall_mesh_rectangle_center() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let op_json = r#"{"id":"op1","type":"cookie_cutter_wall","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(result.ok);
        let mesh = result.value.unwrap();
        assert_eq!(mesh.vertices.len(), 16);
        assert_eq!(mesh.triangles.len(), 32);
    }

    #[test]
    fn test_wall_mesh_rectangle_outside() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let op_json = r#"{"id":"op1","type":"cookie_cutter_wall","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"outside"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(result.ok);
        let mesh = result.value.unwrap();
        assert_eq!(mesh.vertices.len(), 16);
    }

    #[test]
    fn test_wall_mesh_rectangle_inside() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let op_json = r#"{"id":"op1","type":"cookie_cutter_wall","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"inside"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(result.ok);
        assert_eq!(result.value.unwrap().vertices.len(), 16);
    }

    #[test]
    fn test_wall_mesh_open_profile_returns_error() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40}],"closed":false}"#;
        let op_json = r#"{"id":"op1","type":"cookie_cutter_wall","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(!result.ok);
        assert_eq!(result.error.unwrap().code, "PROFILE_NOT_CLOSED");
    }

    #[test]
    fn test_wall_mesh_triangle_profile() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":20,"y":40}],"closed":true}"#;
        let op_json = r#"{"id":"op1","type":"cookie_cutter_wall","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(result.ok);
        assert_eq!(result.value.unwrap().vertices.len(), 12);
    }
}
