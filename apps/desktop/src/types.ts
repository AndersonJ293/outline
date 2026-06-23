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
}

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
  type: "polyline" | "rectangle" | "spline";
  points: Point[];
  closed: boolean;
  controlPoints?: SplineControlPoint[];
  samplingSteps?: number;
}

export interface Operation {
  id: string;
  type: string;
  source_entity_id: string;
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
  | "spline"
  | "move"
  | "mirror";

export type Tool3DMode = "select3d" | "extrude";

export type ExtrudeMode = "normal" | "thin";

export type ViewMode = "sketch" | "solid" | "export";

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
