import type { ToolMode } from "../../types";
import s from "./SketchToolbar.module.css";

interface SketchToolbarProps {
  toolMode: ToolMode;
  snapToGrid: boolean;
  onToolModeChange: (mode: ToolMode) => void;
  onImportImage: () => void;
  onClearSelection: () => void;
  onToggleSnap: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function SketchToolbar({
  toolMode,
  snapToGrid,
  onToolModeChange,
  onImportImage,
  onClearSelection,
  onToggleSnap,
  onUndo,
  onRedo,
}: SketchToolbarProps) {
  return (
    <div className={s.toolbar}>
      <button
            className={`${s["toolbar-btn"]} ${toolMode === "select" ? s.active : ""}`}
            onClick={() => onToolModeChange("select")}
            title="Select (V)"
          >
            ➤
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "polyline" ? s.active : ""}`}
            onClick={() => onToolModeChange("polyline")}
            title="Polyline (P)"
          >
            ✎
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "rectangle" ? s.active : ""}`}
            onClick={() => onToolModeChange("rectangle")}
            title="Rectangle (R)"
          >
            ▭
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "circle" ? s.active : ""}`}
            onClick={() => onToolModeChange("circle")}
            title="Circle (C)"
          >
            ○
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "spline" ? s.active : ""}`}
            onClick={() => onToolModeChange("spline")}
            title="Spline (B)"
          >
            〰
          </button>
          <div className={s["toolbar-divider"]} />
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "move" ? s.active : ""}`}
            onClick={() => onToolModeChange("move")}
            title="Move (M)"
          >
            ✥
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "mirror" ? s.active : ""}`}
            onClick={() => onToolModeChange("mirror")}
            title="Mirror (X) — select contours, then click a line as axis"
          >
            ⇋
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "dimension" ? s.active : ""}`}
            onClick={() => onToolModeChange("dimension")}
            title="Dimension (D) — click a segment, type a length to drive the geometry"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 5v6M14 5v6M2 8h12" />
              <path d="M4 6.5L2 8l2 1.5M12 6.5L14 8l-2 1.5" />
            </svg>
          </button>
          <button
            className={`${s["toolbar-btn"]} ${toolMode === "offset" ? s.active : ""}`}
            onClick={() => onToolModeChange("offset")}
            title="Offset (O) — click a curve and enter offset distance"
          >
            ⟲
          </button>
          <div className={s["toolbar-divider"]} />
          <button
            className={`${s["toolbar-btn"]} ${snapToGrid ? s.active : ""}`}
            onClick={onToggleSnap}
            title={
              snapToGrid
                ? "Snap to grid: ON (hold Alt to bypass)"
                : "Snap to grid: OFF (hold Alt for precision)"
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {snapToGrid ? (
                <>
                  <path d="M2 4h12M2 8h12M2 12h12" />
                  <path d="M4 2v12M8 2v12M12 2v12" opacity="0.45" />
                </>
              ) : (
                <>
                  <path d="M2 4h12M2 8h12M2 12h12" opacity="0.35" />
                  <path d="M3 3l10 10" />
                </>
              )}
            </svg>
          </button>
          <button className={s["toolbar-btn"]} onClick={onImportImage}             title="Import image">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
              <circle cx="5.5" cy="6" r="1.5" />
              <path d="M1.5 11.5l3.5-3.5 2.5 2.5 2-2 3.5 3" />
            </svg>
          </button>
          <button className={s["toolbar-btn"]} onClick={onClearSelection}             title="Clear selection">
            ✕
          </button>
      <div className={s["toolbar-spacer"]} />
      <button className={s["toolbar-btn"]} onClick={onUndo} title="Undo (Ctrl+Z)">
        ↩
      </button>
      <button className={s["toolbar-btn"]} onClick={onRedo} title="Redo (Ctrl+Y)">
        ↪
      </button>
    </div>
  );
}
