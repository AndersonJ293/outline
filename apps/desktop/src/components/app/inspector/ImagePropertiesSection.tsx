import type { SketchImage } from "../../../types";
import type { InspectorPanelProps } from "./types";

type ImagePropertiesSectionProps = Pick<
  InspectorPanelProps,
  | "imageLockAspect"
  | "imageRefScaleMode"
  | "onUpdateImage"
  | "onToggleImageLockAspect"
  | "onSetImageRefScaleMode"
  | "onRemoveSelected"
> & { selectedImage: SketchImage };

export function ImagePropertiesSection({
  selectedImage,
  imageLockAspect,
  imageRefScaleMode,
  onUpdateImage,
  onToggleImageLockAspect,
  onSetImageRefScaleMode,
  onRemoveSelected,
}: ImagePropertiesSectionProps) {
  return (
    <div className="panel-section">
      <h3>Image</h3>
      <ImageSizeFields
        selectedImage={selectedImage}
        imageLockAspect={imageLockAspect}
        onUpdateImage={onUpdateImage}
        onToggleImageLockAspect={onToggleImageLockAspect}
      />
      <div className="panel-field">
        <label>Opacity</label>
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
          {selectedImage.mirrorX ? "↔ Mirrored X" : "↔ Mirror X"}
        </button>
        <button
          className="panel-btn-sm"
          onClick={() => onUpdateImage(selectedImage.id, { mirrorY: !selectedImage.mirrorY })}
        >
          {selectedImage.mirrorY ? "↕ Mirrored Y" : "↕ Mirror Y"}
        </button>
      </div>
      <button
        className={`panel-btn-sm ${imageRefScaleMode ? "active" : ""}`}
        onClick={() => onSetImageRefScaleMode(!imageRefScaleMode)}
      >
        {imageRefScaleMode ? "Cancel scale" : "Scale by reference"}
      </button>
      <button className="panel-btn-sm" onClick={onRemoveSelected}>
        Remove image
      </button>
    </div>
  );
}

function ImageSizeFields({
  selectedImage,
  imageLockAspect,
  onUpdateImage,
  onToggleImageLockAspect,
}: Pick<ImagePropertiesSectionProps, "selectedImage" | "imageLockAspect" | "onUpdateImage" | "onToggleImageLockAspect">) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
      <div className="panel-field" style={{ flex: 1 }}>
        <label>Width (mm)</label>
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
        title={imageLockAspect ? "Aspect locked" : "Aspect free"}
      >
        {imageLockAspect ? "🔗" : "⛓️"}
      </button>
      <div className="panel-field" style={{ flex: 1 }}>
        <label>Height (mm)</label>
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
  );
}
