import { useCallback } from "react";
import * as commands from "../commands";
import { generateId } from "../types";
import type { Mesh, Operation, Project } from "../types";
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
      setError("Crie um projeto primeiro.");
      return;
    }

    const entity = project.sketch.entities.find((item) => item.id === selectedEntityIds[0]);
    if (!entity) {
      setError("Selecione um contorno fechado.");
      return;
    }

    if (!entity.closed) {
      setError("O contorno precisa estar fechado.");
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

    try {
      const result = await commands.generateWallMesh(entity, operation);
      if (result.ok && result.mesh) {
        setCurrentMesh(result.mesh);
        setViewMode("solid");
        setStatus(
          `Cortador gerado: ${result.mesh.vertices.length} vértices, ${result.mesh.triangles.length} triângulos`,
        );
        setError(null);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(`Erro ao gerar cortador: ${err}`);
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
      setError("Gere um cortador primeiro.");
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const fileName = `${safeFileName(project?.project_name ?? "cortador")}.stl`;
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "STL", extensions: ["stl"] }],
      });
      if (!filePath) return;
      const result = await commands.exportStl(currentMesh, filePath);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(`Erro ao exportar STL: ${err}`);
    }
  }, [currentMesh, project, setStatus, setError]);

  return { handleGenerateCutter, handleExportStl };
}
