import type { ExtrudeMode, Tool3DMode } from "../../types";
import s from "./SketchToolbar.module.css";

interface ModelToolbarProps {
  tool3DMode: Tool3DMode;
  extrudeMode: ExtrudeMode;
  onTool3DModeChange: (mode: Tool3DMode) => void;
  onExtrudeModeChange: (mode: ExtrudeMode) => void;
  onClearSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function ModelToolbar({
  tool3DMode,
  extrudeMode,
  onTool3DModeChange,
  onExtrudeModeChange,
  onClearSelection,
  onUndo,
  onRedo,
}: ModelToolbarProps) {
  return (
    <div className={s.toolbar}>
      <button
        className={`${s["toolbar-btn"]} ${tool3DMode === "select3d" ? s.active : ""}`}
        onClick={() => onTool3DModeChange("select3d")}
        title="Select (V)"
      >
        ➤
      </button>
      <button
        className={`${s["toolbar-btn"]} ${tool3DMode === "extrude" ? s.active : ""}`}
        onClick={() => onTool3DModeChange("extrude")}
        title="Extrude (E)"
      >
        ↑
      </button>
      {tool3DMode === "extrude" && (
        <>
          <div className={s["toolbar-divider"]} />
          <button
            className={`${s["toolbar-btn"]} ${extrudeMode === "normal" ? s.active : ""}`}
            onClick={() => onExtrudeModeChange("normal")}
            title="Solid extrude"
          >
            ■
          </button>
          <button
            className={`${s["toolbar-btn"]} ${extrudeMode === "thin" ? s.active : ""}`}
            onClick={() => onExtrudeModeChange("thin")}
            title="Thin wall (cookie cutter)"
          >
            ▢
          </button>
        </>
      )}
      <div className={s["toolbar-divider"]} />
      <button
        className={s["toolbar-btn"]}
        onClick={onClearSelection}
        title="Clear selection"
      >
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
