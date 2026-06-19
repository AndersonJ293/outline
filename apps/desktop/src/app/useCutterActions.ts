import { useCallback } from "react";
import { chainContour, findChainForEntity } from "../features/sketch/chains";
import * as commands from "../commands";
import { generateId } from "../types";
import type { Entity, Mesh, Operation, Project } from "../types";
import { safeFileName } from "./fileNames";

interface UseCutterActionsArgs {
  project: Project | null;
  selectedEntityIds: string[];
  currentMesh: Mesh | null;
  wallHeight: number;
  wallThickness: number;
  offsetSide: "center" | "inside" | "outside";
  setCurrentMesh: (mesh: Mesh | null) => void;
  setViewMode: (mode: "sketch" | "solid" | "export") => void;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
}

function closedProfileEntity(
  entity: Entity,
  project: Project,
): Entity | null {
  if (entity.closed && entity.points.length >= 3) {
    return entity;
  }
  const chain = findChainForEntity(entity, project);
  if (!chain) return null;
  const contour = chainContour(chain, project);
  if (!contour || !contour.closed || contour.points.length < 3) return null;
  return {
    id: generateId(),
    type: "polyline",
    points: contour.points,
    closed: true,
  };
}

export function useCutterActions({
  project,
  selectedEntityIds,
  currentMesh,
  wallHeight,
  wallThickness,
  offsetSide,
  setCurrentMesh,
  setViewMode,
  setStatus,
  setError,
}: UseCutterActionsArgs) {
  const handleGenerateCutter = useCallback(async () => {
    if (!project) {
      setError("Create a project first.");
      return;
    }

    const entity = project.sketch.entities.find((item) => item.id === selectedEntityIds[0]);
    if (!entity) {
      setError("Select a closed profile.");
      return;
    }

    const profile = closedProfileEntity(entity, project);
    if (!profile) {
      setError("The profile must be closed.");
      return;
    }

    const operation: Operation = {
      id: generateId(),
      type: "cookie_cutter_wall",
      source_entity_id: profile.id,
      height_mm: wallHeight,
      wall_thickness_mm: wallThickness,
      offset_side: offsetSide,
    };

    try {
      const result = await commands.generateWallMesh(profile, operation);
      if (result.ok && result.mesh) {
        setCurrentMesh(result.mesh);
        setViewMode("solid");
        setStatus(
          `Cutter generated: ${result.mesh.vertices.length} vertices, ${result.mesh.triangles.length} triangles`,
        );
        setError(null);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(`Failed to generate cutter: ${err}`);
    }
  }, [
    project,
    selectedEntityIds,
    wallHeight,
    wallThickness,
    offsetSide,
    setCurrentMesh,
    setViewMode,
    setStatus,
    setError,
  ]);

  const handleExportStl = useCallback(async () => {
    if (!currentMesh) {
      setError("Generate a cutter first.");
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const fileName = `${safeFileName(project?.project_name ?? "cutter")}.stl`;
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "STL", extensions: ["stl"] }],
      });
      if (!filePath) return;
      const result = await commands.exportStl(currentMesh, filePath);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(`Failed to export STL: ${err}`);
    }
  }, [currentMesh, project, setStatus, setError]);

  return { handleGenerateCutter, handleExportStl };
}
