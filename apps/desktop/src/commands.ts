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
