use crate::project::{Entity, Mesh, Operation, OperationKind};
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
            "The profile must be closed to generate a wall.",
        );
    }
    if entity.points.len() < 3 {
        return CommandResult::err("PROFILE_TOO_SMALL", "The profile needs at least 3 points.");
    }
    CommandResult::ok(true)
}

/// Generates a wall mesh using real 2D offset + extrusion.
/// Supports inside, outside, and centered offset.
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
            "Could not generate the mesh. Check the profile and parameters.",
        ),
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RebuildBody {
    #[serde(rename = "operationId")]
    pub operation_id: String,
    pub mesh: Option<Mesh>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RebuildOutput {
    pub bodies: Vec<RebuildBody>,
}

fn to_geo_entity(e: &crate::project::Entity) -> geometry::entities::Entity {
    geometry::entities::Entity {
        id: e.id.clone(),
        entity_type: e.entity_type.clone(),
        points: e
            .points
            .iter()
            .map(|p| geometry::entities::Point { x: p.x, y: p.y })
            .collect(),
        closed: e.closed,
        control_points: e.control_points.as_ref().map(|cps| {
            cps.iter()
                .map(|cp| geometry::entities::SplineControlPoint {
                    point: geometry::entities::Point {
                        x: cp.point.x,
                        y: cp.point.y,
                    },
                    handle_out: geometry::entities::SplineHandle {
                        dx: cp.handle_out.dx,
                        dy: cp.handle_out.dy,
                    },
                })
                .collect()
        }),
        sampling_steps: e.sampling_steps,
    }
}

fn resolve_profile_points(
    entity: &crate::project::Entity,
    geo_entities: &[geometry::entities::Entity],
    chains: &[geometry::chain::Chain],
) -> Result<Vec<geometry::entities::Point>, String> {
    // Directly closed entity
    if entity.closed && entity.points.len() >= 3 {
        return Ok(entity
            .points
            .iter()
            .map(|p| geometry::entities::Point { x: p.x, y: p.y })
            .collect());
    }

    // Try chain-based profile
    if let Some(chain) = chains.iter().find(|c| c.segment_ids.contains(&entity.id)) {
        if let Some(contour) = geometry::chain::chain_contour(chain, geo_entities) {
            if contour.closed && contour.points.len() >= 3 {
                return Ok(contour.points);
            }
        }
    }

    // Spline: sample and check closure
    if entity.entity_type == "spline" {
        if let Some(ref cps) = entity.control_points {
            if cps.len() < 2 {
                return Err("Spline needs at least 2 control points".to_string());
            }
            let geo_cps: Vec<geometry::entities::SplineControlPoint> = cps
                .iter()
                .map(|cp| geometry::entities::SplineControlPoint {
                    point: geometry::entities::Point {
                        x: cp.point.x,
                        y: cp.point.y,
                    },
                    handle_out: geometry::entities::SplineHandle {
                        dx: cp.handle_out.dx,
                        dy: cp.handle_out.dy,
                    },
                })
                .collect();
            let steps = entity.sampling_steps.unwrap_or(64);
            let sampled = geometry::spline::sample_spline(&geo_cps, steps, entity.closed);
            if entity.closed && sampled.len() >= 3 {
                return Ok(sampled);
            }
            // Even if open spline, try chain
            if let Some(chain) = chains.iter().find(|c| c.segment_ids.contains(&entity.id)) {
                if let Some(contour) = geometry::chain::chain_contour(chain, geo_entities) {
                    if contour.closed && contour.points.len() >= 3 {
                        return Ok(contour.points);
                    }
                }
            }
            return Err("Spline does not form a closed profile".to_string());
        }
    }

    Err("Profile is not closed".to_string())
}

pub fn rebuild_document(
    sketch: &crate::project::Sketch,
    operations: &[Operation],
) -> RebuildOutput {
    let geo_entities: Vec<geometry::entities::Entity> =
        sketch.entities.iter().map(to_geo_entity).collect();
    let chains = geometry::chain::compute_chains(&geo_entities);

    let bodies: Vec<RebuildBody> = operations
        .iter()
        .map(|op| {
            let entity = sketch.entities.iter().find(|e| e.id == op.source_entity_id);
            match entity {
                None => RebuildBody {
                    operation_id: op.id.clone(),
                    mesh: None,
                    error: Some("Source entity not found".to_string()),
                },
                Some(e) => match resolve_profile_points(e, &geo_entities, &chains) {
                    Err(msg) => RebuildBody {
                        operation_id: op.id.clone(),
                        mesh: None,
                        error: Some(msg),
                    },
                    Ok(points) => {
                        let mesh_result = match op.kind() {
                            OperationKind::Extrude => {
                                geometry::mesh::generate_extrude_mesh(&points, op.height_mm)
                            }
                            OperationKind::ExtrudeThin => geometry::mesh::generate_wall_mesh(
                                &points,
                                op.height_mm,
                                op.wall_thickness_mm,
                                &op.offset_side,
                            ),
                        };
                        match mesh_result {
                            Some(mesh_data) => RebuildBody {
                                operation_id: op.id.clone(),
                                mesh: Some(Mesh {
                                    id: format!("mesh_{}", op.id),
                                    vertices: mesh_data.vertices,
                                    triangles: mesh_data.triangles,
                                }),
                                error: None,
                            },
                            None => RebuildBody {
                                operation_id: op.id.clone(),
                                mesh: None,
                                error: Some(
                                    "Could not generate mesh. Check profile and parameters."
                                        .to_string(),
                                ),
                            },
                        }
                    }
                },
            }
        })
        .collect();

    RebuildOutput { bodies }
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
        let json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let op: Operation = serde_json::from_str(json).unwrap();
        assert_eq!(op.id, "op1");
        assert_eq!(op.op_type, "extrude_thin");

        let serialized = serde_json::to_string(&op).unwrap();
        assert!(serialized.contains(r#""type":"extrude_thin""#));
        assert!(!serialized.contains("op_type"));
    }

    #[test]
    fn test_operation_kind_extrude() {
        let json = r#"{"id":"op1","type":"extrude","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":0.0,"offset_side":"center"}"#;
        let op: Operation = serde_json::from_str(json).unwrap();
        assert_eq!(op.kind(), OperationKind::Extrude);
    }

    #[test]
    fn test_operation_kind_extrude_thin() {
        let json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let op: Operation = serde_json::from_str(json).unwrap();
        assert_eq!(op.kind(), OperationKind::ExtrudeThin);
    }

    #[test]
    fn test_wall_mesh_rectangle_center() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
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
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"outside"}"#;
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
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"inside"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(result.ok);
        assert_eq!(result.value.unwrap().vertices.len(), 16);
    }

    #[test]
    fn test_wall_mesh_open_profile_returns_error() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40}],"closed":false}"#;
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(!result.ok);
        assert_eq!(result.error.unwrap().code, "PROFILE_NOT_CLOSED");
    }

    #[test]
    fn test_extrude_solid_rectangle() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let points: Vec<geometry::entities::Point> = entity
            .points
            .iter()
            .map(|p| geometry::entities::Point { x: p.x, y: p.y })
            .collect();
        let mesh = geometry::mesh::generate_extrude_mesh(&points, 15.0).unwrap();
        // n=4 points, 2*n vertices (bottom + top), 4*n triangles (2 caps + 2 sides per edge)
        assert_eq!(mesh.vertices.len(), 8);
        assert_eq!(mesh.triangles.len(), 16);
    }

    #[test]
    fn test_extrude_solid_open_profile_fails() {
        let pts = vec![
            geometry::entities::Point { x: 0.0, y: 0.0 },
            geometry::entities::Point { x: 40.0, y: 0.0 },
            geometry::entities::Point { x: 40.0, y: 40.0 },
        ];
        // generate_extrude_mesh itself doesn't check closed (just needs 3+ points),
        // but the rebuild path requires it via resolve_profile_points.
        // Verify the geometry function works for the open profile (it will produce mesh, but
        // rebuild_document will reject the entity because it's not closed).
        let mesh = geometry::mesh::generate_extrude_mesh(&pts, 15.0).unwrap();
        assert_eq!(mesh.vertices.len(), 6);
    }

    #[test]
    fn test_rebuild_extrude_closed_profile() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![entity],
        };
        let op: Operation = serde_json::from_str(
            r#"{"id":"op1","type":"extrude","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":0.0,"offset_side":"center"}"#,
        )
        .unwrap();
        let result = rebuild_document(&sketch, &[op]);
        assert_eq!(result.bodies.len(), 1);
        assert!(result.bodies[0].mesh.is_some());
        assert!(result.bodies[0].error.is_none());
    }

    #[test]
    fn test_rebuild_extrude_open_profile_errors() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40}],"closed":false}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![entity],
        };
        let op: Operation = serde_json::from_str(
            r#"{"id":"op1","type":"extrude","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":0.0,"offset_side":"center"}"#,
        )
        .unwrap();
        let result = rebuild_document(&sketch, &[op]);
        assert!(result.bodies[0].mesh.is_none());
        assert!(result.bodies[0].error.is_some());
    }

    #[test]
    fn test_rebuild_extrude_thin_open_profile_errors() {
        // extrude_thin also requires a closed profile (cookie-cutter behavior)
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40}],"closed":false}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![entity],
        };
        let op: Operation = serde_json::from_str(
            r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#,
        )
        .unwrap();
        let result = rebuild_document(&sketch, &[op]);
        assert!(result.bodies[0].mesh.is_none());
    }

    #[test]
    fn test_rebuild_empty_operations() {
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![],
        };
        let ops: Vec<Operation> = vec![];
        let result = rebuild_document(&sketch, &ops);
        assert!(result.bodies.is_empty());
    }

    #[test]
    fn test_rebuild_single_operation() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![entity],
        };
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = rebuild_document(&sketch, &[op]);
        assert_eq!(result.bodies.len(), 1);
        assert!(result.bodies[0].mesh.is_some());
        assert!(result.bodies[0].error.is_none());
        assert_eq!(result.bodies[0].operation_id, "op1");
    }

    #[test]
    fn test_rebuild_operation_with_missing_entity() {
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![],
        };
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = rebuild_document(&sketch, &[op]);
        assert_eq!(result.bodies.len(), 1);
        assert!(result.bodies[0].mesh.is_none());
        assert_eq!(
            result.bodies[0].error,
            Some("Source entity not found".to_string())
        );
    }

    #[test]
    fn test_rebuild_mixed_results() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":40,"y":40},{"x":0,"y":40}],"closed":true}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let sketch = crate::project::Sketch {
            plane: "XY".to_string(),
            entities: vec![entity],
        };
        let op1: Operation = serde_json::from_str(
            r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#,
        ).unwrap();
        let op2: Operation = serde_json::from_str(
            r#"{"id":"op2","type":"extrude_thin","source_entity_id":"missing","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#,
        ).unwrap();
        let result = rebuild_document(&sketch, &[op1, op2]);
        assert_eq!(result.bodies.len(), 2);
        assert!(result.bodies[0].mesh.is_some());
        assert!(result.bodies[0].error.is_none());
        assert!(result.bodies[1].mesh.is_none());
        assert!(result.bodies[1].error.is_some());
        assert_eq!(result.bodies[1].operation_id, "op2");
    }

    #[test]
    fn test_wall_mesh_triangle_profile() {
        let entity_json = r#"{"id":"e1","type":"polyline","points":[{"x":0,"y":0},{"x":40,"y":0},{"x":20,"y":40}],"closed":true}"#;
        let op_json = r#"{"id":"op1","type":"extrude_thin","source_entity_id":"e1","height_mm":15.0,"wall_thickness_mm":1.2,"offset_side":"center"}"#;
        let entity: Entity = serde_json::from_str(entity_json).unwrap();
        let op: Operation = serde_json::from_str(op_json).unwrap();
        let result = generate_wall_mesh(&entity, &op);
        assert!(result.ok);
        assert_eq!(result.value.unwrap().vertices.len(), 12);
    }
}
