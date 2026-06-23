import type { ExtrudeMode } from "../../../types";
import s from "./panel-shared.module.css";

type ExtrudeToolSectionProps = {
  extrudeMode: ExtrudeMode;
  wallHeight: number;
  wallThickness: number;
  offsetSide: "center" | "inside" | "outside";
  onSetWallHeight: (value: number) => void;
  onSetWallThickness: (value: number) => void;
  onSetOffsetSide: (value: "center" | "inside" | "outside") => void;
};

export function ExtrudeToolSection({
  extrudeMode,
  wallHeight,
  wallThickness,
  offsetSide,
  onSetWallHeight,
  onSetWallThickness,
  onSetOffsetSide,
}: ExtrudeToolSectionProps) {
  return (
    <div className={s["panel-section"]}>
      <h3>Extrude Tool</h3>
      <div className={s["panel-field"]}>
        <label>Height (mm)</label>
        <input
          type="number"
          min={1}
          max={100}
          step={0.5}
          value={wallHeight}
          onChange={(event) => onSetWallHeight(Number(event.target.value))}
        />
      </div>
      {extrudeMode === "thin" && (
        <>
          <div className={s["panel-field"]}>
            <label>Wall thickness (mm)</label>
            <input
              type="number"
              min={0.4}
              max={10}
              step={0.1}
              value={wallThickness}
              onChange={(event) => onSetWallThickness(Number(event.target.value))}
            />
          </div>
          <div className={s["panel-field"]}>
            <label>Offset side</label>
            <select
              value={offsetSide}
              onChange={(event) =>
                onSetOffsetSide(event.target.value as "center" | "inside" | "outside")
              }
            >
              <option value="center">Centered</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
