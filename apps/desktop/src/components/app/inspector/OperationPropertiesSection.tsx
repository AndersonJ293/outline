import type { Operation } from "../../../types";
import s from "./panel-shared.module.css";

type OperationPropertiesSectionProps = {
  operation: Operation;
  onUpdateOperation: (id: string, updates: Partial<Operation>) => void;
  onRemoveOperation: (id: string) => void;
};

export function OperationPropertiesSection({
  operation,
  onUpdateOperation,
  onRemoveOperation,
}: OperationPropertiesSectionProps) {
  const isThin = operation.type === "extrude_thin";
  return (
    <div className={s["panel-section"]}>
      <h3>{isThin ? "Thin Extrude" : "Extrude"}</h3>
      <div className={s["panel-field"]}>
        <label>Height (mm)</label>
        <input
          type="number"
          min={1}
          max={100}
          step={0.5}
          value={operation.height_mm}
          onChange={(event) =>
            onUpdateOperation(operation.id, { height_mm: Number(event.target.value) })
          }
        />
      </div>
      {isThin && (
        <>
          <div className={s["panel-field"]}>
            <label>Wall thickness (mm)</label>
            <input
              type="number"
              min={0.4}
              max={10}
              step={0.1}
              value={operation.wall_thickness_mm}
              onChange={(event) =>
                onUpdateOperation(operation.id, {
                  wall_thickness_mm: Number(event.target.value),
                })
              }
            />
          </div>
          <div className={s["panel-field"]}>
            <label>Offset side</label>
            <select
              value={operation.offset_side}
              onChange={(event) =>
                onUpdateOperation(operation.id, {
                  offset_side: event.target.value as "center" | "inside" | "outside",
                })
              }
            >
              <option value="center">Centered</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
          </div>
        </>
      )}
      <button
        type="button"
        className={s["panel-btn-sm"]}
        onClick={() => onRemoveOperation(operation.id)}
      >
        Delete operation
      </button>
    </div>
  );
}
