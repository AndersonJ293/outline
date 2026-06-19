import type { Entity } from "../../../types";

export function EntityPropertiesSection({ selectedEntity }: { selectedEntity: Entity }) {
  return (
    <div className="panel-section">
      <h3>Properties</h3>
      <div className="panel-field">
        <label>Type</label>
        <input value={selectedEntity.type} readOnly />
      </div>
      <div className="panel-field">
        <label>Points</label>
        <input value={`${selectedEntity.points.length}`} readOnly />
      </div>
      <div className="panel-field">
        <label>Closed</label>
        <input value={selectedEntity.closed ? "Yes" : "No"} readOnly />
      </div>
    </div>
  );
}
