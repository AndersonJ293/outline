import { useCallback } from "react";
import { generateId } from "../types";
import type { Entity, Mesh, Operation, Project } from "../types";
import * as commands from "../commands";
import { safeFileName } from "./fileNames";

interface UseCutterActionsArgs {
  project: Project | null;
  selectedEntityIds: string[];
  bodies: Record<string, Mesh>;
  wallHeight: number;
  wallThickness: number;
  offsetSide: "center" | "inside" | "outside";
  addOperation: (op: Operation) => void;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
}

export function useCutterActions({
  project,
  selectedEntityIds,
  bodies,
  wallHeight,
  wallThickness,
  offsetSide,
  addOperation,
  setStatus,
  setError,
}: UseCutterActionsArgs) {
  const handleGenerateCutter = useCallback(() => {
    if (!project) {
      setError("Create a project first.");
      return;
    }

    const entity = project.sketch.entities.find((item) => item.id === selectedEntityIds[0]);
    if (!entity) {
      setError("Select an entity.");
      return;
    }

    const operation: Operation = {
      id: generateId(),
      type: "cookie_cutter_wall",
      source_entity_id: entity.id,
      height_mm: wallHeight,
      wall_thickness_mm: wallThickness,
      offset_side: offsetSide,
    };

    addOperation(operation);
    setStatus("Operation added. Rebuilding...");
    setError(null);
  }, [
    project,
    selectedEntityIds,
    wallHeight,
    wallThickness,
    offsetSide,
    addOperation,
    setStatus,
    setError,
  ]);

  const handleExportStl = useCallback(async () => {
    const bodyEntries = Object.values(bodies);
    if (bodyEntries.length === 0) {
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
      const result = await commands.exportStl(bodyEntries[0], filePath);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(`Failed to export STL: ${err}`);
    }
  }, [bodies, project, setStatus, setError]);

  return { handleGenerateCutter, handleExportStl };
}
