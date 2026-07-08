import { useCallback } from "react";
import type { Mesh, Project } from "../types";
import * as commands from "../commands";
import { safeFileName } from "./fileNames";

interface UseExportActionsArgs {
  project: Project | null;
  bodies: Record<string, Mesh>;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
}

export function mergeMeshes(meshes: Mesh[]): Mesh {
  const vertices: Mesh["vertices"] = [];
  const triangles: Mesh["triangles"] = [];
  for (const mesh of meshes) {
    const offset = vertices.length;
    vertices.push(...mesh.vertices);
    for (const tri of mesh.triangles) {
      triangles.push([tri[0] + offset, tri[1] + offset, tri[2] + offset]);
    }
  }
  return { id: "merged_export", vertices, triangles };
}

export function useExportActions({ project, bodies, setStatus, setError }: UseExportActionsArgs) {
  const handleExportStl = useCallback(async () => {
    const bodyEntries = Object.values(bodies);
    if (bodyEntries.length === 0) {
      setError("No mesh to export. Extrude a profile first.");
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
      const result = await commands.exportStl(mergeMeshes(bodyEntries), filePath);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(`Failed to export STL: ${err}`);
    }
  }, [bodies, project, setStatus, setError]);

  return { handleExportStl };
}
