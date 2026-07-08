// ── Core domain types (mirror of Rust DTOs) ──

export interface Project {
  version: number;
  units: string;
  project_name: string;
  sketch: Sketch;
  operations: Operation[];
}

export interface SketchImage {
  id: string;
  type: "image";
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  source: string;
  rotation: number;
  mirrorX: boolean;
  mirrorY: boolean;
  opacity: number;
}

export interface Sketch {
  plane: string;
  entities: Entity[];
  images?: SketchImage[];
  dimensions?: Dimension[];
}

export interface SketchProfile {
  id: string;
  outerEntityId: string;
  innerEntityId?: string;
  areaMm2: number;
}

/// A linear dimension drives the length of one entity segment.
/// The segment endpoints are `entity.points[segIdx]` and the next point
/// (wrapping to index 0 when the entity is closed). Editing `value`
/// repositions the geometry so the segment matches the requested length.
export interface LinearDimension {
  id: string;
  kind: "linear";
  entityId: string;
  segIdx: number;
  value: number;
  /// Perpendicular offset (mm) of the dimension line from the segment.
  offset: number;
}

/// Annotates an offset curve: `entityId` is the source curve, `offsetEntityId`
/// is the generated curve, and `value` is the distance (mm) between them.
export interface OffsetDimension {
  id: string;
  kind: "offset";
  entityId: string;
  offsetEntityId: string;
  value: number;
}

/// Diameter annotation for a circle: a line through the center at `angle`
/// (radians), editable/draggable/deletable like Fusion's diameter dimension.
export interface DiameterDimension {
  id: string;
  kind: "diameter";
  entityId: string;
  value: number;
  angle: number;
}

export type Dimension = LinearDimension | OffsetDimension | DiameterDimension;

export interface Point {
  x: number;
  y: number;
}

export interface SplineHandle {
  dx: number;
  dy: number;
}

export interface SplineControlPoint {
  point: Point;
  handleOut: SplineHandle;
}

export interface Entity {
  id: string;
  type: "polyline" | "rectangle" | "spline" | "circle";
  points: Point[];
  closed: boolean;
  center?: Point;
  radiusMm?: number;
  controlPoints?: SplineControlPoint[];
  samplingSteps?: number;
}

export interface Operation {
  id: string;
  type: string;
  source_entity_id?: string;
  sourceProfileId?: string;
  operation?: "join" | "cut" | "intersect" | "new_body";
  height_mm: number;
  wall_thickness_mm: number;
  offset_side: "center" | "inside" | "outside";
}

export interface Mesh {
  id: string;
  vertices: [number, number, number][];
  triangles: [number, number, number][];
}

export interface CommandResult<T> {
  ok: boolean;
  value?: T;
  error?: CommandError;
}

export interface CommandError {
  code: string;
  message: string;
}

export interface ValidateProfileResult {
  ok: boolean;
  error?: CommandError;
}

export interface GenerateMeshResult {
  ok: boolean;
  mesh?: Mesh;
  error?: CommandError;
}

export interface OffsetEntityResult {
  ok: boolean;
  entity?: Entity;
  error?: CommandError;
}

export interface RebuildInput {
  sketch: Sketch;
  operations: Operation[];
}

export interface RebuildBody {
  operationId: string;
  mesh?: Mesh;
  error?: string;
}

export interface RebuildOutput {
  bodies: RebuildBody[];
}

// ── Tool types ──

export type ToolMode =
  | "select"
  | "polyline"
  | "rectangle"
  | "circle"
  | "spline"
  | "move"
  | "mirror"
  | "dimension"
  | "offset";

export type Tool3DMode = "select3d" | "extrude";

export type ExtrudeMode = "normal" | "thin";

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface WorkingPlane {
  origin: [number, number, number];
  normal: [number, number, number];
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function pointDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
