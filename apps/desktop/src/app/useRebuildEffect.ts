import { useEffect, useRef } from "react";
import type { Project } from "../types";
import * as commands from "../commands";

export function useRebuildEffect(
  project: Project | null,
  setBodies: (bodies: Record<string, import("../types").Mesh>, errors: Record<string, string>) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const result = await commands.rebuildDocument({
          sketch: project.sketch,
          operations: project.operations,
        });
        const bodies: Record<string, import("../types").Mesh> = {};
        const errors: Record<string, string> = {};
        for (const body of result.bodies) {
          if (body.mesh) {
            bodies[body.operationId] = body.mesh;
          }
          if (body.error) {
            errors[body.operationId] = body.error;
          }
        }
        setBodies(bodies, errors);
      } catch {
        // rebuild failed silently; bodyErrors will be empty
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [project, setBodies]);
}
