import type { InspectorPanelProps } from "./types";

type CutterSectionProps = Pick<
  InspectorPanelProps,
  | "selectedEntity"
  | "wallHeight"
  | "wallThickness"
  | "offsetSide"
  | "onSetWallHeight"
  | "onSetWallThickness"
  | "onSetOffsetSide"
  | "onGenerateCutter"
>;

export function CutterSection({
  selectedEntity,
  wallHeight,
  wallThickness,
  offsetSide,
  onSetWallHeight,
  onSetWallThickness,
  onSetOffsetSide,
  onGenerateCutter,
}: CutterSectionProps) {
  return (
    <div className="panel-section">
      <h3>Cortador</h3>
      <div className="panel-field">
        <label>Altura (mm)</label>
        <input
          type="number"
          min={1}
          max={100}
          step={0.5}
          value={wallHeight}
          onChange={(event) => onSetWallHeight(Number(event.target.value))}
        />
      </div>
      <div className="panel-field">
        <label>Espessura da parede (mm)</label>
        <input
          type="number"
          min={0.4}
          max={10}
          step={0.1}
          value={wallThickness}
          onChange={(event) => onSetWallThickness(Number(event.target.value))}
        />
      </div>
      <div className="panel-field">
        <label>Lado do offset</label>
        <select
          value={offsetSide}
          onChange={(event) =>
            onSetOffsetSide(event.target.value as "center" | "inside" | "outside")
          }
        >
          <option value="center">Centralizado</option>
          <option value="inside">Interno</option>
          <option value="outside">Externo</option>
        </select>
      </div>
      <button
        className="panel-btn"
        onClick={onGenerateCutter}
        disabled={!selectedEntity || !selectedEntity.closed}
      >
        Gerar Cortador
      </button>
    </div>
  );
}
