import { EntityPropertiesSection } from "./EntityPropertiesSection";
import { ExtrudeToolSection } from "./ExtrudeToolSection";
import { ImagePropertiesSection } from "./ImagePropertiesSection";
import { MeshSection } from "./MeshSection";
import type { ExtrudeMode, Tool3DMode } from "../../../types";
import type { InspectorPanelProps } from "./types";
import s from "./panel-shared.module.css";

type DetailsPanelProps = Pick<
  InspectorPanelProps,
  | "selectedEntity"
  | "selectedImage"
  | "bodies"
  | "bodyErrors"
  | "imageLockAspect"
  | "imageRefScaleMode"
  | "wallHeight"
  | "wallThickness"
  | "offsetSide"
  | "previewWireframe"
  | "onUpdateImage"
  | "onToggleImageLockAspect"
  | "onSetImageRefScaleMode"
  | "onRemoveSelected"
  | "onSetWallHeight"
  | "onSetWallThickness"
  | "onSetOffsetSide"
  | "onSetPreviewWireframe"
  | "onExportStl"
> & {
  tool3DMode: Tool3DMode;
  extrudeMode: ExtrudeMode;
};

export function DetailsPanel(props: DetailsPanelProps) {
  const {
    selectedEntity,
    selectedImage,
    bodies,
    bodyErrors,
    imageLockAspect,
    imageRefScaleMode,
    wallHeight,
    wallThickness,
    offsetSide,
    previewWireframe,
    onUpdateImage,
    onToggleImageLockAspect,
    onSetImageRefScaleMode,
    onRemoveSelected,
    onSetWallHeight,
    onSetWallThickness,
    onSetOffsetSide,
    onSetPreviewWireframe,
    onExportStl,
    tool3DMode,
    extrudeMode,
  } = props;

  const bodyCount = Object.keys(bodies).length;
  const headerLabel = selectedEntity
    ? "Entity"
    : selectedImage
      ? "Image"
      : bodyCount > 0
        ? "Mesh"
        : null;

  return (
    <div className={s["panel-details"]}>
      {headerLabel && (
        <div className={s["panel-details-header"]}>
          <span className={s["panel-details-title"]}>{headerLabel}</span>
        </div>
      )}

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

      {tool3DMode === "extrude" && (
        <ExtrudeToolSection
          extrudeMode={extrudeMode}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          offsetSide={offsetSide}
          onSetWallHeight={onSetWallHeight}
          onSetWallThickness={onSetWallThickness}
          onSetOffsetSide={onSetOffsetSide}
        />
      )}

      {bodyCount > 0 && (
        <MeshSection
          bodies={bodies}
          bodyErrors={bodyErrors}
          previewWireframe={previewWireframe}
          onSetPreviewWireframe={onSetPreviewWireframe}
          onExportStl={onExportStl}
        />
      )}
    </div>
  );
}
