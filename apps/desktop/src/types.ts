// ── Core domain types (espelho dos DTOs Rust) ──

export interface Project {
  version: number;
  units: string;
  project_name: string;
  sketch: Sketch;
  operations: Operation[];
}

export interface Sketch {
  plane: string;
  entities: Entity[];
}

export interface Entity {
  id: string;
  entity_type: "polyline" | "rectangle";
  points: Point[];
  closed: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Operation {
  id: string;
  op_type: string;
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

// ── Tool types ──

export type ToolMode = "select" | "polyline" | "rectangle";

export type ViewMode = "sketch" | "preview";

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function pointDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
