import { CutterSection } from "./CutterSection";
import { EntityPropertiesSection } from "./EntityPropertiesSection";
import { ImagePropertiesSection } from "./ImagePropertiesSection";
import { MeshSection } from "./MeshSection";
import type { InspectorPanelProps } from "./types";
import s from "./panel-shared.module.css";

type DetailsPanelProps = Pick<
  InspectorPanelProps,
  | "selectedEntity"
  | "selectedImage"
  | "currentMesh"
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
  | "onGenerateCutter"
  | "onSetPreviewWireframe"
  | "onExportStl"
>;

export function DetailsPanel(props: DetailsPanelProps) {
  const {
    selectedEntity,
    selectedImage,
    currentMesh,
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
    onGenerateCutter,
    onSetPreviewWireframe,
    onExportStl,
  } = props;

  const headerLabel = selectedEntity
    ? "Entity"
    : selectedImage
      ? "Image"
      : currentMesh
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

      {selectedEntity && (
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
      )}

      {currentMesh && (
        <MeshSection
          currentMesh={currentMesh}
          previewWireframe={previewWireframe}
          onSetPreviewWireframe={onSetPreviewWireframe}
          onExportStl={onExportStl}
        />
      )}
    </div>
  );
}
