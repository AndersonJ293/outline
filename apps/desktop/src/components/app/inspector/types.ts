import type { Entity, Mesh, Project, SketchImage } from "../../../types";
import type { EntityDragTarget } from "../../../stores/types";

export interface InspectorPanelProps {
  project: Project | null;
  selectedEntityIds: string[];
  selectedEntity: Entity | null;
  selectedImage: SketchImage | null;
  bodies: Record<string, Mesh>;
  bodyErrors: Record<string, string>;
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
  onSetEditingImageId: (id: string | null) => void;
  onSetEntityDragTarget: (target: EntityDragTarget | null) => void;
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
