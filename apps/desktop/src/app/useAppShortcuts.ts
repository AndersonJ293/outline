import { useEffect } from "react";
import type { Project, ToolMode, ViewMode } from "../types";

interface UseAppShortcutsArgs {
  selectedEntityIds: string[];
  project: Project | null;
  removeSelectedEntities: () => void;
  undo: () => void;
  redo: () => void;
  handleNewProject: () => void;
  handleOpen: () => void;
  handleSave: () => void;
  selectEntity: (id: string | null, shiftKey?: boolean) => void;
  setEditingImageId: (id: string | null) => void;
  setStatus: (text: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setToolMode: (mode: ToolMode) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useAppShortcuts({
  selectedEntityIds,
  project,
  removeSelectedEntities,
  undo,
  redo,
  handleNewProject,
  handleOpen,
  handleSave,
  selectEntity,
  setEditingImageId,
  setStatus,
  setViewMode,
  setToolMode,
}: UseAppShortcutsArgs): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedEntityIds.length > 0 && project) {
          removeSelectedEntities();
          setStatus(`${selectedEntityIds.length} entit${selectedEntityIds.length === 1 ? "y" : "ies"} removed`);
        }
      }
      if (event.ctrlKey && event.key === "z") {
        event.preventDefault();
        undo();
        setStatus("Undo");
      }
      if (event.ctrlKey && event.key === "y") {
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
      }
      if (event.ctrlKey && event.key === "1") {
        event.preventDefault();
        setViewMode("sketch");
      }
      if (event.ctrlKey && event.key === "2") {
        event.preventDefault();
        setViewMode("solid");
      }
      if (event.ctrlKey && event.key === "3") {
        event.preventDefault();
        setViewMode("export");
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "v") {
          event.preventDefault();
          setToolMode("select");
        } else if (key === "p") {
          event.preventDefault();
          setToolMode("polyline");
        } else if (key === "r") {
          event.preventDefault();
          setToolMode("rectangle");
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedEntityIds,
    project,
    removeSelectedEntities,
    undo,
    redo,
    handleNewProject,
    handleOpen,
    handleSave,
    selectEntity,
    setEditingImageId,
    setStatus,
    setViewMode,
    setToolMode,
  ]);
}
