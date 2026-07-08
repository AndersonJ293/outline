import { DetailsPanel } from "./inspector/DetailsPanel";
import { ProjectTree } from "./inspector/ProjectTree";
import type { ExtrudeMode, Tool3DMode } from "../../types";
import type { InspectorPanelProps } from "./inspector/types";
import s from "./InspectorPanel.module.css";
import shared from "./inspector/panel-shared.module.css";

type InspectorPanelExtras = {
  tool3DMode: Tool3DMode;
  extrudeMode: ExtrudeMode;
};

export function InspectorPanel({
  project,
  selectedEntityIds,
  selectedEntity,
  selectedImage,
  bodies,
  bodyErrors,
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
  onSetEditingImageId,
  onSetEntityDragTarget,
  onRemoveSelected,
  onRemoveOperation,
  onCreateProfileExtrude,
  selectedOperationId,
  onSelectOperation,
  onUpdateOperation,
  onUpdateImage,
  onToggleImageLockAspect,
  onSetImageRefScaleMode,
  onSetWallHeight,
  onSetWallThickness,
  onSetOffsetSide,
  onSetPreviewWireframe,
  onExportStl,
  tool3DMode,
  extrudeMode,
}: InspectorPanelProps & InspectorPanelExtras) {
  const bodyCount = Object.keys(bodies).length;
  const selectedOperation =
    project?.operations.find((op) => op.id === selectedOperationId) ?? null;
  const hasDetails =
    selectedEntityIds.length > 0 ||
    bodyCount > 0 ||
    tool3DMode === "extrude" ||
    selectedOperation !== null;

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
              bodies={bodies}
              bodyErrors={bodyErrors}
              onSelectEntity={onSelectEntity}
              onSetEditingImageId={onSetEditingImageId}
              onSetEntityDragTarget={onSetEntityDragTarget}
              onRemoveSelected={onRemoveSelected}
              onRemoveOperation={onRemoveOperation}
              onCreateProfileExtrude={onCreateProfileExtrude}
              selectedOperationId={selectedOperationId}
              onSelectOperation={onSelectOperation}
            />
          </div>
        </div>

        {hasDetails && (
          <DetailsPanel
            selectedEntity={selectedEntity}
            selectedImage={selectedImage}
            bodies={bodies}
            bodyErrors={bodyErrors}
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
            onRemoveOperation={onRemoveOperation}
            selectedOperation={selectedOperation}
            onUpdateOperation={onUpdateOperation}
            onSetWallHeight={onSetWallHeight}
            onSetWallThickness={onSetWallThickness}
            onSetOffsetSide={onSetOffsetSide}
            onSetPreviewWireframe={onSetPreviewWireframe}
            onExportStl={onExportStl}
            tool3DMode={tool3DMode}
            extrudeMode={extrudeMode}
          />
        )}
      </div>
    </div>
  );
}
