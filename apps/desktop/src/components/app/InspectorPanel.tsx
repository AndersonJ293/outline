import type { Entity, Mesh, Project, SketchImage } from "../../types";

interface InspectorPanelProps {
  project: Project | null;
  selectedEntityIds: string[];
  selectedEntity: Entity | null;
  selectedImage: SketchImage | null;
  currentMesh: Mesh | null;
  panelCollapsed: boolean;
  imageLockAspect: boolean;
  imageRefScaleMode: boolean;
  wallHeight: number;
  wallThickness: number;
  offsetSide: "center" | "inside" | "outside";
  previewWireframe: boolean;
  onTogglePanel: () => void;
  onResizeStart: (event: React.MouseEvent) => void;
  onSelectEntity: (id: string, shiftKey?: boolean) => void;
  onRemoveSelected: () => void;
  onUpdateImage: (id: string, updates: Partial<SketchImage>) => void;
  onToggleImageLockAspect: () => void;
  onSetImageRefScaleMode: (active: boolean) => void;
  onSetWallHeight: (value: number) => void;
  onSetWallThickness: (value: number) => void;
  onSetOffsetSide: (value: "center" | "inside" | "outside") => void;
  onGenerateCutter: () => void;
  onSetPreviewWireframe: (active: boolean) => void;
  onExportStl: () => void;
}

export function InspectorPanel({
  project,
  selectedEntityIds,
  selectedEntity,
  selectedImage,
  currentMesh,
  panelCollapsed,
  imageLockAspect,
  imageRefScaleMode,
  wallHeight,
  wallThickness,
  offsetSide,
  previewWireframe,
  onTogglePanel,
  onResizeStart,
  onSelectEntity,
  onRemoveSelected,
  onUpdateImage,
  onToggleImageLockAspect,
  onSetImageRefScaleMode,
  onSetWallHeight,
  onSetWallThickness,
  onSetOffsetSide,
  onGenerateCutter,
  onSetPreviewWireframe,
  onExportStl,
}: InspectorPanelProps) {
  if (selectedEntityIds.length === 0 && !currentMesh) return null;

  return (
    <div className="panel-shell">
      <button
        className="panel-toggle"
        onClick={onTogglePanel}
        title={panelCollapsed ? "Mostrar painel" : "Recolher painel"}
      >
        {panelCollapsed ? "‹" : "›"}
      </button>
      {!panelCollapsed && (
        <div className="panel-resizer" onMouseDown={onResizeStart} title="Redimensionar painel" />
      )}
      <div className="panel">
        <EntitiesSection
          project={project}
          selectedEntityIds={selectedEntityIds}
          onSelectEntity={onSelectEntity}
          onRemoveSelected={onRemoveSelected}
        />

        {selectedEntity && <EntityPropertiesSection selectedEntity={selectedEntity} />}

        {selectedImage && (
          <ImagePropertiesSection
            selectedImage={selectedImage}
            imageLockAspect={imageLockAspect}
            imageRefScaleMode={imageRefScaleMode}
            onUpdateImage={onUpdateImage}
            onToggleImageLockAspect={onToggleImageLockAspect}
            onSetImageRefScaleMode={onSetImageRefScaleMode}
            onRemoveSelected={onRemoveSelected}
          />
        )}

        <CutterSection
          selectedEntity={selectedEntity}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          offsetSide={offsetSide}
          onSetWallHeight={onSetWallHeight}
          onSetWallThickness={onSetWallThickness}
          onSetOffsetSide={onSetOffsetSide}
          onGenerateCutter={onGenerateCutter}
        />

        {currentMesh && (
          <MeshSection
            currentMesh={currentMesh}
            previewWireframe={previewWireframe}
            onSetPreviewWireframe={onSetPreviewWireframe}
            onExportStl={onExportStl}
          />
        )}
      </div>
    </div>
  );
}

function EntitiesSection({
  project,
  selectedEntityIds,
  onSelectEntity,
  onRemoveSelected,
}: Pick<InspectorPanelProps, "project" | "selectedEntityIds" | "onSelectEntity" | "onRemoveSelected">) {
  return (
    <div className="panel-section">
      <h3>
        Entidades
        {selectedEntityIds.length > 1 && (
          <span className="panel-badge">{selectedEntityIds.length} selecionadas</span>
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
          Use a polyline ou retângulo para desenhar.
        </p>
      )}
    </div>
  );
}

function EntityPropertiesSection({ selectedEntity }: { selectedEntity: Entity }) {
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

function ImagePropertiesSection({
  selectedImage,
  imageLockAspect,
  imageRefScaleMode,
  onUpdateImage,
  onToggleImageLockAspect,
  onSetImageRefScaleMode,
  onRemoveSelected,
}: Pick<
  InspectorPanelProps,
  | "selectedImage"
  | "imageLockAspect"
  | "imageRefScaleMode"
  | "onUpdateImage"
  | "onToggleImageLockAspect"
  | "onSetImageRefScaleMode"
  | "onRemoveSelected"
> & { selectedImage: SketchImage }) {
  return (
    <div className="panel-section">
      <h3>Imagem</h3>
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
        <div className="panel-field" style={{ flex: 1 }}>
          <label>Largura (mm)</label>
          <input
            type="number"
            min={1}
            value={Math.round(selectedImage.widthMm * 10) / 10}
            onChange={(event) => {
              const value = Math.max(1, Number(event.target.value));
              if (imageLockAspect) {
                const ratio = selectedImage.heightMm / selectedImage.widthMm;
                onUpdateImage(selectedImage.id, { widthMm: value, heightMm: value * ratio });
              } else {
                onUpdateImage(selectedImage.id, { widthMm: value });
              }
            }}
          />
        </div>
        <button
          style={{
            background: "none",
            border: "1px solid var(--border)",
            color: imageLockAspect ? "var(--accent)" : "var(--text-secondary)",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
            padding: "4px 6px",
            marginTop: 14,
            lineHeight: 1,
          }}
          onClick={onToggleImageLockAspect}
          title={imageLockAspect ? "Proporção travada" : "Proporção livre"}
        >
          {imageLockAspect ? "🔗" : "⛓️"}
        </button>
        <div className="panel-field" style={{ flex: 1 }}>
          <label>Altura (mm)</label>
          <input
            type="number"
            min={1}
            value={Math.round(selectedImage.heightMm * 10) / 10}
            onChange={(event) => {
              const value = Math.max(1, Number(event.target.value));
              if (imageLockAspect) {
                const ratio = selectedImage.widthMm / selectedImage.heightMm;
                onUpdateImage(selectedImage.id, { heightMm: value, widthMm: value * ratio });
              } else {
                onUpdateImage(selectedImage.id, { heightMm: value });
              }
            }}
          />
        </div>
      </div>
      <div className="panel-field">
        <label>Opacidade</label>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={selectedImage.opacity}
          onChange={(event) => onUpdateImage(selectedImage.id, { opacity: Number(event.target.value) })}
        />
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          {Math.round(selectedImage.opacity * 100)}%
        </span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          className="panel-btn-sm"
          onClick={() => onUpdateImage(selectedImage.id, { mirrorX: !selectedImage.mirrorX })}
        >
          {selectedImage.mirrorX ? "↔ Espelhado X" : "↔ Espelhar X"}
        </button>
        <button
          className="panel-btn-sm"
          onClick={() => onUpdateImage(selectedImage.id, { mirrorY: !selectedImage.mirrorY })}
        >
          {selectedImage.mirrorY ? "↕ Espelhado Y" : "↕ Espelhar Y"}
        </button>
      </div>
      <button
        className={`panel-btn-sm ${imageRefScaleMode ? "active" : ""}`}
        onClick={() => onSetImageRefScaleMode(!imageRefScaleMode)}
      >
        {imageRefScaleMode ? "Cancelar escala" : "Escala por referência"}
      </button>
      <button className="panel-btn-sm" onClick={onRemoveSelected}>
        Remover imagem
      </button>
    </div>
  );
}

function CutterSection({
  selectedEntity,
  wallHeight,
  wallThickness,
  offsetSide,
  onSetWallHeight,
  onSetWallThickness,
  onSetOffsetSide,
  onGenerateCutter,
}: Pick<
  InspectorPanelProps,
  | "selectedEntity"
  | "wallHeight"
  | "wallThickness"
  | "offsetSide"
  | "onSetWallHeight"
  | "onSetWallThickness"
  | "onSetOffsetSide"
  | "onGenerateCutter"
>) {
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

function MeshSection({
  currentMesh,
  previewWireframe,
  onSetPreviewWireframe,
  onExportStl,
}: Pick<
  InspectorPanelProps,
  "currentMesh" | "previewWireframe" | "onSetPreviewWireframe" | "onExportStl"
> & { currentMesh: Mesh }) {
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
