import { useState } from "react";
import type { Entity, Mesh, Operation, Project, SketchImage } from "../../../types";
import type { InspectorPanelProps } from "./types";

type ProjectTreeProps = Pick<
  InspectorPanelProps,
  "project" | "selectedEntityIds" | "currentMesh" | "onSelectEntity" | "onRemoveSelected"
>;

type CategoryId = "sketch" | "images" | "operations" | "mesh";

interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: "sketch", label: "Sketch", icon: "✎" },
  { id: "images", label: "Images", icon: "▣" },
  { id: "operations", label: "Operations", icon: "⊞" },
  { id: "mesh", label: "Mesh", icon: "◇" },
];

const COLLAPSED_DEFAULT: Record<CategoryId, boolean> = {
  sketch: false,
  images: false,
  operations: true,
  mesh: true,
};

export function ProjectTree({
  project,
  selectedEntityIds,
  currentMesh,
  onSelectEntity,
  onRemoveSelected,
}: ProjectTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<CategoryId, boolean>>(COLLAPSED_DEFAULT);

  const toggle = (id: CategoryId) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const entities = project?.sketch.entities ?? [];
  const images = project?.sketch.images ?? [];
  const operations = project?.operations ?? [];

  return (
    <div className="project-tree">
      <Category
        id="sketch"
        collapsed={collapsed.sketch}
        count={entities.length}
        onToggle={() => toggle("sketch")}
      >
        {entities.length === 0 ? (
          <EmptyRow text="No sketch entities yet" />
        ) : (
          entities.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              selected={selectedEntityIds.includes(entity.id)}
              onSelect={() => onSelectEntity(entity.id)}
              onRemove={() => {
                onSelectEntity(entity.id);
                onRemoveSelected();
              }}
            />
          ))
        )}
      </Category>

      <Category
        id="images"
        collapsed={collapsed.images}
        count={images.length}
        onToggle={() => toggle("images")}
      >
        {images.length === 0 ? (
          <EmptyRow text="No images imported" />
        ) : (
          images.map((image) => (
            <ImageRow
              key={image.id}
              image={image}
              selected={selectedEntityIds.includes(image.id)}
              onSelect={() => onSelectEntity(image.id)}
              onRemove={() => {
                onSelectEntity(image.id);
                onRemoveSelected();
              }}
            />
          ))
        )}
      </Category>

      <Category
        id="operations"
        collapsed={collapsed.operations}
        count={operations.length}
        onToggle={() => toggle("operations")}
      >
        {operations.length === 0 ? (
          <EmptyRow text="No operations defined" />
        ) : (
          operations.map((op) => <OperationRow key={op.id} op={op} />)
        )}
      </Category>

      <Category
        id="mesh"
        collapsed={collapsed.mesh}
        count={currentMesh ? 1 : 0}
        onToggle={() => toggle("mesh")}
      >
        {currentMesh ? <MeshRow mesh={currentMesh} /> : <EmptyRow text="No mesh generated" />}
      </Category>
    </div>
  );
}

interface CategoryProps {
  id: CategoryId;
  collapsed: boolean;
  count: number;
  onToggle: () => void;
  children: React.ReactNode;
}

function Category({ id, collapsed, count, onToggle, children }: CategoryProps) {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) return null;
  return (
    <div className="tree-section">
      <button
        type="button"
        className="tree-header"
        onClick={onToggle}
        aria-expanded={!collapsed}
        title={collapsed ? `Expand ${def.label}` : `Collapse ${def.label}`}
      >
        <span className="tree-chevron">{collapsed ? "▸" : "▾"}</span>
        <span className="tree-category-icon">{def.icon}</span>
        <span className="tree-label">{def.label}</span>
        <span className="tree-count">{count}</span>
      </button>
      {!collapsed && <div className="tree-children">{children}</div>}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="tree-empty">{text}</div>;
}

interface EntityRowProps {
  entity: Entity;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function EntityRow({ entity, selected, onSelect, onRemove }: EntityRowProps) {
  const icon = entity.type === "rectangle" ? "▭" : "〰";
  const label = `${entity.type} · ${entity.points.length} pts`;
  return (
    <div className={`tree-row ${selected ? "selected" : ""}`}>
      <button
        type="button"
        className="tree-row-main"
        onClick={onSelect}
        title={label}
      >
        <span className="tree-item-icon">{icon}</span>
        <span className="tree-item-label">{label}</span>
        {entity.closed && <span className="tree-item-badge" title="Closed">●</span>}
      </button>
      <button
        type="button"
        className="tree-row-remove"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

interface ImageRowProps {
  image: SketchImage;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function ImageRow({ image, selected, onSelect, onRemove }: ImageRowProps) {
  const label = `image · ${image.widthMm.toFixed(1)}×${image.heightMm.toFixed(1)} mm`;
  return (
    <div className={`tree-row ${selected ? "selected" : ""}`}>
      <button
        type="button"
        className="tree-row-main"
        onClick={onSelect}
        title={label}
      >
        <span className="tree-item-icon">▣</span>
        <span className="tree-item-label">{label}</span>
      </button>
      <button
        type="button"
        className="tree-row-remove"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

function OperationRow({ op }: { op: Operation }) {
  const label = `${op.type} · ${op.height_mm} mm`;
  return (
    <div className="tree-row readonly">
      <span className="tree-row-main">
        <span className="tree-item-icon">⊞</span>
        <span className="tree-item-label">{label}</span>
      </span>
    </div>
  );
}

function MeshRow({ mesh }: { mesh: Mesh }) {
  const label = `mesh · ${mesh.vertices.length} v · ${mesh.triangles.length} t`;
  return (
    <div className="tree-row readonly">
      <span className="tree-row-main">
        <span className="tree-item-icon">◇</span>
        <span className="tree-item-label">{label}</span>
      </span>
    </div>
  );
}
