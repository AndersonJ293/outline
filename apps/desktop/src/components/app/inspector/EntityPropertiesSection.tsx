import type { Entity } from "../../../types";

export function EntityPropertiesSection({ selectedEntity }: { selectedEntity: Entity }) {
  return (
    <div className="panel-section">
      <h3>Propriedades</h3>
      <div className="panel-field">
        <label>Tipo</label>
        <input value={selectedEntity.type} readOnly />
      </div>
      <div className="panel-field">
        <label>Pontos</label>
        <input value={`${selectedEntity.points.length}`} readOnly />
      </div>
      <div className="panel-field">
        <label>Fechado</label>
        <input value={selectedEntity.closed ? "Sim" : "Não"} readOnly />
      </div>
    </div>
  );
}
