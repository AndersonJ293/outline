import { useEffect } from "react";
import type { Project, Tool3DMode, ToolMode } from "../types";
import type { EntityDragTarget, Vertex } from "../stores/types";

interface UseAppShortcutsArgs {
  selectedEntityIds: string[];
  selectedVertices: Vertex[];
  project: Project | null;
  isSketching: boolean;
  removeSelectedEntities: () => void;
  removeSelectedVertices: () => void;
  undo: () => void;
  redo: () => void;
  handleNewProject: () => void;
  handleOpen: () => void;
  handleSave: () => void;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setEditingImageId: (id: string | null) => void;
  setEntityDragTarget: (target: EntityDragTarget | null) => void;
  setStatus: (text: string) => void;
  setToolMode: (mode: ToolMode) => void;
  setTool3DMode: (mode: Tool3DMode) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useAppShortcuts({
  selectedEntityIds,
  selectedVertices,
  project,
  isSketching,
  removeSelectedEntities,
  removeSelectedVertices,
  undo,
  redo,
  handleNewProject,
  handleOpen,
  handleSave,
  selectEntity,
  setEditingImageId,
  setEntityDragTarget,
  setStatus,
  setToolMode,
  setTool3DMode,
}: UseAppShortcutsArgs): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (event.defaultPrevented) return;
        // Loose vertices take priority: delete points, not the whole contour.
        if (selectedVertices.length > 0 && project) {
          removeSelectedVertices();
          setStatus(
            `${selectedVertices.length} point${selectedVertices.length === 1 ? "" : "s"} removed`,
          );
        } else if (selectedEntityIds.length > 0 && project) {
          removeSelectedEntities();
          setStatus(`${selectedEntityIds.length} entit${selectedEntityIds.length === 1 ? "y" : "ies"} removed`);
        }
      }
      if (event.ctrlKey && event.key === "z") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        undo();
        setStatus("Undo");
      }
      if (event.ctrlKey && event.key === "y") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        redo();
        setStatus("Redo");
      }
      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void handleNewProject();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        handleOpen();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
      if (event.key === "Escape") {
        selectEntity(null);
        setEditingImageId(null);
        setEntityDragTarget(null);
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        if (isSketching) {
          if (key === "v") {
            event.preventDefault();
            setToolMode("select");
          } else if (key === "p") {
            event.preventDefault();
            setToolMode("polyline");
          } else if (key === "r") {
            event.preventDefault();
            setToolMode("rectangle");
          } else if (key === "b") {
            event.preventDefault();
            setToolMode("spline");
          } else if (key === "m") {
            event.preventDefault();
            setToolMode("move");
          } else if (key === "x") {
            event.preventDefault();
            setToolMode("mirror");
          }
        } else {
          if (key === "v") {
            event.preventDefault();
            setTool3DMode("select3d");
          } else if (key === "e") {
            event.preventDefault();
            setTool3DMode("extrude");
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedEntityIds,
    selectedVertices,
    project,
    isSketching,
    removeSelectedEntities,
    removeSelectedVertices,
    undo,
    redo,
    handleNewProject,
    handleOpen,
    handleSave,
    selectEntity,
    setEditingImageId,
    setEntityDragTarget,
    setStatus,
    setToolMode,
    setTool3DMode,
  ]);
}
