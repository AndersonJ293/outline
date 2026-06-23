use std::sync::Mutex;

mod commands;
use commands::*;

#[derive(Debug, Default)]
pub struct AppState {
    pub project: Mutex<Option<outline_core::project::Project>>,
}

#[tauri::command]
fn log_to_terminal(message: String) {
    eprintln!("[app] {}", message);
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
fn new_project(name: String) -> Result<ProjectDto, String> {
    let project = outline_core::project::Project::new(&name);
    Ok(ProjectDto::from(&project))
}

#[tauri::command]
fn validate_closed_profile(entities_json: String) -> Result<ValidateProfileResult, String> {
    let entity: outline_core::project::Entity = serde_json::from_str(&entities_json)
        .map_err(|e| format!("Failed to parse entity: {}", e))?;

    let result = outline_core::commands::validate_closed_profile(&entity);

    Ok(ValidateProfileResult {
        ok: result.ok,
        error: result.error.map(|e| CommandErrorDto {
            code: e.code,
            message: e.message,
        }),
    })
}

#[tauri::command]
fn generate_wall_mesh(
    entity_json: String,
    operation_json: String,
) -> Result<GenerateMeshResult, String> {
    let entity: outline_core::project::Entity =
        serde_json::from_str(&entity_json).map_err(|e| format!("Failed to parse entity: {}", e))?;
    let operation: outline_core::project::Operation = serde_json::from_str(&operation_json)
        .map_err(|e| format!("Failed to parse operation: {}", e))?;

    let result = outline_core::commands::generate_wall_mesh(&entity, &operation);

    match result {
        outline_core::commands::CommandResult {
            ok: true,
            value: Some(mesh),
            ..
        } => Ok(GenerateMeshResult {
            ok: true,
            mesh: Some(MeshDto {
                id: mesh.id,
                vertices: mesh.vertices,
                triangles: mesh.triangles,
            }),
            error: None,
        }),
        outline_core::commands::CommandResult {
            error: Some(err), ..
        } => Ok(GenerateMeshResult {
            ok: false,
            mesh: None,
            error: Some(CommandErrorDto {
                code: err.code,
                message: err.message,
            }),
        }),
        _ => Err("Unexpected result".to_string()),
    }
}

#[tauri::command]
fn export_stl(mesh_json: String, output_path: String) -> Result<String, String> {
    let mesh_dto: MeshDto =
        serde_json::from_str(&mesh_json).map_err(|e| format!("Failed to parse mesh: {}", e))?;

    let mesh_data = export::stl::MeshData {
        vertices: mesh_dto.vertices,
        triangles: mesh_dto.triangles,
    };

    let path = std::path::Path::new(&output_path);
    export::stl::export_stl_binary(&mesh_data, path)?;

    Ok(format!("STL exported to: {}", output_path))
}

#[tauri::command]
fn save_file(path: String, data: String) -> Result<String, String> {
    std::fs::write(&path, &data).map_err(|e| format!("Failed to save: {}", e))?;
    Ok(path)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))
}

#[tauri::command]
fn rebuild_document(input_json: String) -> Result<RebuildOutputDto, String> {
    let input: RebuildInputDto =
        serde_json::from_str(&input_json).map_err(|e| format!("Failed to parse input: {}", e))?;

    let entities: Vec<outline_core::project::Entity> = input
        .sketch
        .entities
        .into_iter()
        .map(|e| outline_core::project::Entity {
            id: e.id,
            entity_type: e.entity_type,
            points: e
                .points
                .into_iter()
                .map(|p| outline_core::project::Point { x: p.x, y: p.y })
                .collect(),
            closed: e.closed,
            control_points: e.control_points.map(|cps| {
                cps.into_iter()
                    .map(|cp| outline_core::project::SplineControlPoint {
                        point: outline_core::project::Point {
                            x: cp.point.x,
                            y: cp.point.y,
                        },
                        handle_out: outline_core::project::SplineHandle {
                            dx: cp.handle_out.dx,
                            dy: cp.handle_out.dy,
                        },
                    })
                    .collect()
            }),
            sampling_steps: e.sampling_steps,
        })
        .collect();

    let operations: Vec<outline_core::project::Operation> = input
        .operations
        .into_iter()
        .map(|op| outline_core::project::Operation {
            id: op.id,
            op_type: op.op_type,
            source_entity_id: op.source_entity_id,
            height_mm: op.height_mm,
            wall_thickness_mm: op.wall_thickness_mm,
            offset_side: op.offset_side,
        })
        .collect();

    let sketch = outline_core::project::Sketch {
        plane: input.sketch.plane,
        entities,
    };

    let output = outline_core::commands::rebuild_document(&sketch, &operations);

    let bodies = output
        .bodies
        .into_iter()
        .map(|b| RebuildBodyDto {
            operation_id: b.operation_id,
            mesh: b.mesh.map(|m| MeshDto {
                id: m.id,
                vertices: m.vertices,
                triangles: m.triangles,
            }),
            error: b.error,
        })
        .collect();

    Ok(RebuildOutputDto { bodies })
}

#[tauri::command]
fn read_image_base64(path: String) -> Result<String, String> {
    use base64::Engine;
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read image: {}", e))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    let lower = path.to_lowercase();
    let mime = if lower.ends_with(".png") {
        "image/png"
    } else {
        "image/jpeg"
    };
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            log_to_terminal,
            ping,
            new_project,
            validate_closed_profile,
            generate_wall_mesh,
            export_stl,
            save_file,
            read_file,
            read_image_base64,
            rebuild_document,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to start Outline");
}
