import type { Mesh } from "../../../types";
import type { InspectorPanelProps } from "./types";

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
    <div className="panel-section">
      <h3>Malha</h3>
      <div className="panel-field">
        <label>Vértices</label>
        <input value={`${currentMesh.vertices.length}`} readOnly />
      </div>
      <div className="panel-field">
        <label>Triângulos</label>
        <input value={`${currentMesh.triangles.length}`} readOnly />
      </div>
      <label className="panel-checkbox">
        <input
          type="checkbox"
          checked={previewWireframe}
          onChange={(event) => onSetPreviewWireframe(event.target.checked)}
        />
        Wireframe
      </label>
      <button className="panel-btn" onClick={onExportStl}>
        Exportar STL
      </button>
    </div>
  );
}
