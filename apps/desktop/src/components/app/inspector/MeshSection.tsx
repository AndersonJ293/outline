import type { Mesh } from "../../../types";
import type { InspectorPanelProps } from "./types";
import s from "./panel-shared.module.css";

type MeshSectionProps = Pick<
  InspectorPanelProps,
  "previewWireframe" | "onSetPreviewWireframe" | "onExportStl"
> & { currentMesh: Mesh };

export function MeshSection({
  currentMesh,
  previewWireframe,
  onSetPreviewWireframe,
  onExportStl,
}: MeshSectionProps) {
  return (
    <div className={s["panel-section"]}>
      <h3>Mesh</h3>
      <div className={s["panel-field"]}>
        <label>Vertices</label>
        <input value={`${currentMesh.vertices.length}`} readOnly />
      </div>
      <div className={s["panel-field"]}>
        <label>Triangles</label>
        <input value={`${currentMesh.triangles.length}`} readOnly />
      </div>
      <label className={s["panel-checkbox"]}>
        <input
          type="checkbox"
          checked={previewWireframe}
          onChange={(event) => onSetPreviewWireframe(event.target.checked)}
        />
        Wireframe
      </label>
      <button className={s["panel-btn"]} onClick={onExportStl}>
        Export STL
      </button>
    </div>
  );
}
