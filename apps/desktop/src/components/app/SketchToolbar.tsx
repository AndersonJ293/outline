import type { ToolMode, ViewMode } from "../../types";

interface SketchToolbarProps {
  viewMode: ViewMode;
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
  viewMode,
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
    <div className="toolbar">
      {viewMode === "sketch" && (
        <>
          <button
            className={`toolbar-btn ${toolMode === "select" ? "active" : ""}`}
            onClick={() => onToolModeChange("select")}
            title="Select (V)"
          >
            ➤
          </button>
          <button
            className={`toolbar-btn ${toolMode === "polyline" ? "active" : ""}`}
            onClick={() => onToolModeChange("polyline")}
            title="Polyline (P)"
          >
            ✎
          </button>
          <button
            className={`toolbar-btn ${toolMode === "rectangle" ? "active" : ""}`}
            onClick={() => onToolModeChange("rectangle")}
            title="Rectangle (R)"
          >
            ▭
          </button>
          <div className="toolbar-divider" />
          <button
            className={`toolbar-btn ${snapToGrid ? "active" : ""}`}
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
          <button className="toolbar-btn" onClick={onImportImage}             title="Import image">
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
          <button className="toolbar-btn" onClick={onClearSelection}             title="Clear selection">
            ✕
          </button>
        </>
      )}
      <div className="toolbar-spacer" />
      <button className="toolbar-btn" onClick={onUndo} title="Undo (Ctrl+Z)">
        ↩
      </button>
      <button className="toolbar-btn" onClick={onRedo} title="Redo (Ctrl+Y)">
        ↪
      </button>
    </div>
  );
}
