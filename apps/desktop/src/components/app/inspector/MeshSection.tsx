import type { Mesh } from "../../../types";
import type { InspectorPanelProps } from "./types";
import s from "./panel-shared.module.css";

type MeshSectionProps = Pick<
  InspectorPanelProps,
  "bodies" | "bodyErrors" | "previewWireframe" | "onSetPreviewWireframe" | "onExportStl"
>;

export function MeshSection({
  bodies,
  bodyErrors,
  previewWireframe,
  onSetPreviewWireframe,
  onExportStl,
}: MeshSectionProps) {
  const meshes = Object.values(bodies);
  const totalVertices = meshes.reduce((sum, m) => sum + m.vertices.length, 0);
  const totalTriangles = meshes.reduce((sum, m) => sum + m.triangles.length, 0);

  return (
    <div className={s["panel-section"]}>
      <h3>Mesh</h3>
      <div className={s["panel-field"]}>
        <label>Bodies</label>
        <input value={`${meshes.length}`} readOnly />
      </div>
      <div className={s["panel-field"]}>
        <label>Vertices</label>
        <input value={`${totalVertices}`} readOnly />
      </div>
      <div className={s["panel-field"]}>
        <label>Triangles</label>
        <input value={`${totalTriangles}`} readOnly />
      </div>
      {Object.keys(bodyErrors).length > 0 && (
        <div className={s["panel-field"]}>
          <label>Errors</label>
          <span style={{ color: "#ff5252", fontSize: "0.8em" }}>
            {Object.values(bodyErrors).join("; ")}
          </span>
        </div>
      )}
      <label className={s["panel-checkbox"]}>
        <input
          type="checkbox"
          checked={previewWireframe}
          onChange={(event) => onSetPreviewWireframe(event.target.checked)}
        />
        Wireframe
      </label>
      {meshes.length > 0 && (
        <button className={s["panel-btn"]} onClick={onExportStl}>
          Export STL
        </button>
      )}
    </div>
  );
}
