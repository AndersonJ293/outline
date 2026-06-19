import type { Entity } from "../../../types";
import s from "./panel-shared.module.css";

export function EntityPropertiesSection({ selectedEntity }: { selectedEntity: Entity }) {
  const anchorLabel =
    selectedEntity.type === "spline"
      ? "Anchors"
      : "Points";
  const anchorCount =
    selectedEntity.type === "spline"
      ? selectedEntity.controlPoints?.length ?? 0
      : selectedEntity.points.length;
  return (
    <div className={s["panel-section"]}>
      <h3>Properties</h3>
      <div className={s["panel-field"]}>
        <label>Type</label>
        <input value={selectedEntity.type} readOnly />
      </div>
      <div className={s["panel-field"]}>
        <label>{anchorLabel}</label>
        <input value={`${anchorCount}`} readOnly />
      </div>
      <div className={s["panel-field"]}>
        <label>Closed</label>
        <input value={selectedEntity.closed ? "Yes" : "No"} readOnly />
      </div>
    </div>
  );
}
