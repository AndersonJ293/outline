import { invoke } from "@tauri-apps/api/core";
import type {
  Project,
  Entity,
  Operation,
  Mesh,
  ValidateProfileResult,
  GenerateMeshResult,
} from "./types";

export async function ping(): Promise<string> {
  return invoke<string>("ping");
}

export async function newProject(name: string): Promise<Project> {
  return invoke<Project>("new_project", { name });
}

export async function validateClosedProfile(
  entity: Entity,
): Promise<ValidateProfileResult> {
  return invoke<ValidateProfileResult>("validate_closed_profile", {
    entitiesJson: JSON.stringify(entity),
  });
}

export async function generateWallMesh(
  entity: Entity,
  operation: Operation,
): Promise<GenerateMeshResult> {
  return invoke<GenerateMeshResult>("generate_wall_mesh", {
    entityJson: JSON.stringify(entity),
    operationJson: JSON.stringify(operation),
  });
}

export async function exportStl(
  mesh: Mesh,
  outputPath: string,
): Promise<string> {
  return invoke<string>("export_stl", {
    meshJson: JSON.stringify(mesh),
    outputPath,
  });
}

export async function saveFile(path: string, data: string): Promise<string> {
  return invoke<string>("save_file", { path, data });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function readImageBase64(path: string): Promise<string> {
  return invoke<string>("read_image_base64", { path });
}
