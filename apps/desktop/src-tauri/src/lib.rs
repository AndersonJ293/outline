use std::sync::Mutex;

mod commands;
use commands::*;

#[derive(Debug, Default)]
pub struct AppState {
    pub project: Mutex<Option<outline_core::project::Project>>,
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
            ping,
            new_project,
            validate_closed_profile,
            generate_wall_mesh,
            export_stl,
            save_file,
            read_file,
            read_image_base64,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to start Outline");
}
