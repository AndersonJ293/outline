import { CutterSection } from "./inspector/CutterSection";
import { EntitiesSection } from "./inspector/EntitiesSection";
import { EntityPropertiesSection } from "./inspector/EntityPropertiesSection";
import { ImagePropertiesSection } from "./inspector/ImagePropertiesSection";
import { MeshSection } from "./inspector/MeshSection";
import type { InspectorPanelProps } from "./inspector/types";

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
