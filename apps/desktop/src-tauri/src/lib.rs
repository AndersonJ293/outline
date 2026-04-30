use std::sync::Mutex;

mod commands;
use commands::*;

#[derive(Debug, Default)]
pub struct AppState {
    pub project: Mutex<Option<cortacad_core::project::Project>>,
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
fn new_project(name: String) -> Result<ProjectDto, String> {
    let project = cortacad_core::project::Project::new(&name);
    Ok(ProjectDto::from(&project))
}

#[tauri::command]
fn validate_closed_profile(entities_json: String) -> Result<ValidateProfileResult, String> {
    let entity: cortacad_core::project::Entity = serde_json::from_str(&entities_json)
        .map_err(|e| format!("Erro ao parsear entidade: {}", e))?;

    let result = cortacad_core::commands::validate_closed_profile(&entity);

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
    let entity: cortacad_core::project::Entity = serde_json::from_str(&entity_json)
        .map_err(|e| format!("Erro ao parsear entidade: {}", e))?;
    let operation: cortacad_core::project::Operation = serde_json::from_str(&operation_json)
        .map_err(|e| format!("Erro ao parsear operação: {}", e))?;

    let result = cortacad_core::commands::generate_wall_mesh(&entity, &operation);

    match result {
        cortacad_core::commands::CommandResult { ok: true, value: Some(mesh), .. } => {
            Ok(GenerateMeshResult {
                ok: true,
                mesh: Some(MeshDto {
                    id: mesh.id,
                    vertices: mesh.vertices,
                    triangles: mesh.triangles,
                }),
                error: None,
            })
        }
        cortacad_core::commands::CommandResult { error: Some(err), .. } => {
            Ok(GenerateMeshResult {
                ok: false,
                mesh: None,
                error: Some(CommandErrorDto {
                    code: err.code,
                    message: err.message,
                }),
            })
        }
        _ => Err("Resultado inesperado".to_string()),
    }
}

#[tauri::command]
fn export_stl(mesh_json: String, output_path: String) -> Result<String, String> {
    let mesh_dto: MeshDto = serde_json::from_str(&mesh_json)
        .map_err(|e| format!("Erro ao parsear malha: {}", e))?;

    let mesh_data = export::stl::MeshData {
        vertices: mesh_dto.vertices,
        triangles: mesh_dto.triangles,
    };

    let path = std::path::Path::new(&output_path);
    export::stl::export_stl_binary(&mesh_data, path)?;

    Ok(format!("STL exportado para: {}", output_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            ping,
            new_project,
            validate_closed_profile,
            generate_wall_mesh,
            export_stl,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar CortaCAD");
}
