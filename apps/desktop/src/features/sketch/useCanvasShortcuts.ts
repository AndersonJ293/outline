import { useEffect, type RefObject, type MutableRefObject } from "react";
import type { Point, ToolMode } from "../../types";

interface UseCanvasShortcutsArgs {
  altKeyPressed: MutableRefObject<boolean>;
  cursorWorld: MutableRefObject<Point>;
  isPasteFloating: MutableRefObject<boolean>;
  pasteIds: MutableRefObject<string[]>;
  pasteLast: MutableRefObject<Point>;
  copySelection: () => void;
  pasteAtPoint: (world: Point) => string[];
  setToolMode: (mode: ToolMode) => void;
  setStatus: (text: string) => void;
  undo: () => void;
}

export function useCanvasShortcuts({
  altKeyPressed,
  cursorWorld,
  isPasteFloating,
  pasteIds,
  pasteLast,
  copySelection,
  pasteAtPoint,
  setToolMode,
  setStatus,
  undo,
}: UseCanvasShortcutsArgs) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") altKeyPressed.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") altKeyPressed.current = false;
    };
    const onBlur = () => { altKeyPressed.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [altKeyPressed]);

  useEffect(() => {
    const isEditable = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    };
    const onKey = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        copySelection();
        setStatus("Copied selection");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "v") {
        event.preventDefault();
        const at = cursorWorld.current;
        const ids = pasteAtPoint(at);
        if (ids.length === 0) return;
        setToolMode("move");
        isPasteFloating.current = true;
        pasteIds.current = ids;
        pasteLast.current = at;
        setStatus("Paste: move to position, click to place, Esc to cancel");
        return;
      }
      if (event.key === "Escape" && isPasteFloating.current) {
        event.preventDefault();
        isPasteFloating.current = false;
        pasteIds.current = [];
        undo();
        setStatus("Paste cancelled");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copySelection, pasteAtPoint, setToolMode, setStatus, undo, cursorWorld, isPasteFloating, pasteIds, pasteLast]);
}
