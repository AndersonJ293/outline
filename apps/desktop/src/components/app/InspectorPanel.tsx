import { DetailsPanel } from "./inspector/DetailsPanel";
import { ProjectTree } from "./inspector/ProjectTree";
import type { InspectorPanelProps } from "./inspector/types";
import s from "./InspectorPanel.module.css";
import shared from "./inspector/panel-shared.module.css";

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
    <div className={s["panel-shell"]}>
      <button
        className={s["panel-toggle"]}
        onClick={onTogglePanel}
        title={panelCollapsed ? "Show panel" : "Hide panel"}
      >
        {panelCollapsed ? "‹" : "›"}
      </button>
      {!panelCollapsed && (
        <div className={s["panel-resizer"]} onMouseDown={onResizeStart} title="Resize panel" />
      )}
      <div className={`${shared["panel-split"]} ${hasDetails ? shared["has-details"] : ""}`}>
        <div className={shared["panel-tree"]}>
          <div className={shared["panel-tree-header"]}>
            <h3>{project?.project_name ?? "Project"}</h3>
          </div>
          <div className={shared["panel-tree-body"]}>
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
