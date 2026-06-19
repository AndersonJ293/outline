import type { InspectorPanelProps } from "./types";

type EntitiesSectionProps = Pick<
  InspectorPanelProps,
  "project" | "selectedEntityIds" | "onSelectEntity" | "onRemoveSelected"
>;

export function EntitiesSection({
  project,
  selectedEntityIds,
  onSelectEntity,
  onRemoveSelected,
}: EntitiesSectionProps) {
  return (
    <div className="panel-section">
      <h3>
        Entities
        {selectedEntityIds.length > 1 && (
          <span className="panel-badge">{selectedEntityIds.length} selected</span>
        )}
      </h3>
      {project && project.sketch.entities.length > 0 ? (
        <div className="entities-list">
          {project.sketch.entities.map((entity) => (
            <div
              key={entity.id}
              className={`entities-list-item ${selectedEntityIds.includes(entity.id) ? "selected" : ""}`}
              onClick={() => onSelectEntity(entity.id)}
            >
              <span>
                {entity.type} ({entity.points.length} pts)
                {entity.closed ? " 🔒" : ""}
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--danger)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectEntity(entity.id, false);
                  onRemoveSelected();
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          Use the polyline or rectangle tool to draw.
        </p>
      )}
    </div>
  );
}
