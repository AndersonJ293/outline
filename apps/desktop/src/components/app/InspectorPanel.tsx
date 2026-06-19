import { DetailsPanel } from "./inspector/DetailsPanel";
import { ProjectTree } from "./inspector/ProjectTree";
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
  const hasDetails = selectedEntityIds.length > 0 || Boolean(currentMesh);

  return (
    <div className="panel-shell">
      <button
        className="panel-toggle"
        onClick={onTogglePanel}
        title={panelCollapsed ? "Show panel" : "Hide panel"}
      >
        {panelCollapsed ? "‹" : "›"}
      </button>
      {!panelCollapsed && (
        <div className="panel-resizer" onMouseDown={onResizeStart} title="Resize panel" />
      )}
      <div className={`panel-split ${hasDetails ? "has-details" : ""}`}>
        <div className="panel-tree">
          <div className="panel-tree-header">
            <h3>{project?.project_name ?? "Project"}</h3>
          </div>
          <div className="panel-tree-body">
            <ProjectTree
              project={project}
              selectedEntityIds={selectedEntityIds}
              currentMesh={currentMesh}
              onSelectEntity={onSelectEntity}
              onRemoveSelected={onRemoveSelected}
            />
          </div>
        </div>

        {hasDetails && (
          <DetailsPanel
            selectedEntity={selectedEntity}
            selectedImage={selectedImage}
            currentMesh={currentMesh}
            imageLockAspect={imageLockAspect}
            imageRefScaleMode={imageRefScaleMode}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
            offsetSide={offsetSide}
            previewWireframe={previewWireframe}
            onUpdateImage={onUpdateImage}
            onToggleImageLockAspect={onToggleImageLockAspect}
            onSetImageRefScaleMode={onSetImageRefScaleMode}
            onRemoveSelected={onRemoveSelected}
            onSetWallHeight={onSetWallHeight}
            onSetWallThickness={onSetWallThickness}
            onSetOffsetSide={onSetOffsetSide}
            onGenerateCutter={onGenerateCutter}
            onSetPreviewWireframe={onSetPreviewWireframe}
            onExportStl={onExportStl}
          />
        )}
      </div>
    </div>
  );
}
