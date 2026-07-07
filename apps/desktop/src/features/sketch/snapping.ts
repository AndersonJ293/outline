import type { Entity, Point, ViewportState } from "../../types";
import { pointDistance } from "../../types";
import { SNAP_PX } from "./constants";
import { getSnapStep, snapToGrid } from "./geometry";

export type SnapKind =
  | "none"
  | "grid"
  | "endpoint"
  | "midpoint"
  | "horizontal"
  | "vertical"
  | "align";

/// A dashed inference line to draw between a reference point and the snap.
export interface SnapGuide {
  from: Point;
  to: Point;
}

export interface SnapResult {
  point: Point;
  snapped: boolean;
  kind: SnapKind;
  guides: SnapGuide[];
  /// Set for endpoint/midpoint snaps, where a marker glyph helps.
  marker: Point | null;
}

export interface SnapContext {
  entities: Entity[];
  viewport: ViewportState;
  gridEnabled: boolean;
  /// Alt held, or snapping fully off — return the raw point.
  bypass: boolean;
  /// Last placed drawing point, used to infer horizontal/vertical lines.
  anchor: Point | null;
}

const RAW: Omit<SnapResult, "point"> = {
  snapped: false,
  kind: "none",
  guides: [],
  marker: null,
};

function entityVertices(e: Entity): Point[] {
  if (e.type === "spline" && e.controlPoints) {
    return e.controlPoints.map((c) => c.point);
  }
  return e.points;
}

/// Resolve the best snap for `world`, Fusion-style: endpoints and midpoints
/// win first, then horizontal/vertical inference relative to the drawing
/// anchor and X/Y alignment with existing vertices, then the grid.
export function computeSnap(world: Point, ctx: SnapContext): SnapResult {
  const { entities, viewport, gridEnabled, bypass, anchor } = ctx;
  if (bypass) return { point: { ...world }, ...RAW };

  const tol = SNAP_PX / viewport.zoom;

  const verts: Point[] = [];
  const mids: Point[] = [];
  for (const e of entities) {
    const pts = entityVertices(e);
    for (let i = 0; i < pts.length; i++) {
      verts.push(pts[i]);
      const b = pts[i + 1] ?? (e.closed ? pts[0] : null);
      if (b) mids.push({ x: (pts[i].x + b.x) / 2, y: (pts[i].y + b.y) / 2 });
    }
  }

  // 1. Endpoint — strongest.
  const ep = nearestWithin(world, verts, tol);
  if (ep) return { point: { ...ep }, snapped: true, kind: "endpoint", guides: [], marker: { ...ep } };

  // 2. Midpoint.
  const mp = nearestWithin(world, mids, tol);
  if (mp) return { point: { ...mp }, snapped: true, kind: "midpoint", guides: [], marker: { ...mp } };

  // 3. Independent X and Y inference (anchor H/V > vertex alignment > grid).
  const x = resolveAxis("x", world, anchor, verts, tol);
  const y = resolveAxis("y", world, anchor, verts, tol);

  const point: Point = { x: x.value, y: y.value };
  const guides: SnapGuide[] = [];
  if (x.ref) guides.push({ from: { ...x.ref }, to: point });
  if (y.ref) guides.push({ from: { ...y.ref }, to: point });

  let kind: SnapKind = "none";
  if (x.source === "anchor") kind = "vertical";
  else if (y.source === "anchor") kind = "horizontal";
  else if (x.source === "align" || y.source === "align") kind = "align";

  if (kind !== "none") {
    return { point, snapped: true, kind, guides, marker: null };
  }

  // 4. Grid fallback.
  if (gridEnabled) {
    const step = getSnapStep(viewport.zoom);
    return { point: snapToGrid(world, step), snapped: true, kind: "grid", guides: [], marker: null };
  }

  return { point: { ...world }, ...RAW };
}

function nearestWithin(world: Point, points: Point[], tol: number): Point | null {
  let best: Point | null = null;
  let bestD = tol;
  for (const p of points) {
    const d = pointDistance(world, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

type AxisSource = "anchor" | "align" | null;

interface AxisResolution {
  value: number;
  source: AxisSource;
  /// Reference point the value was borrowed from (for drawing a guide).
  ref: Point | null;
}

/// Snap one coordinate to the anchor (H/V line) or an aligned vertex.
function resolveAxis(
  axis: "x" | "y",
  world: Point,
  anchor: Point | null,
  verts: Point[],
  tol: number,
): AxisResolution {
  const cur = world[axis];
  let best: AxisResolution = { value: cur, source: null, ref: null };
  let bestD = tol;

  // Anchor alignment (vertical line shares x; horizontal line shares y).
  if (anchor) {
    const d = Math.abs(cur - anchor[axis]);
    if (d < bestD) {
      bestD = d;
      best = { value: anchor[axis], source: "anchor", ref: anchor };
    }
  }

  // Alignment with any existing vertex.
  for (const v of verts) {
    const d = Math.abs(cur - v[axis]);
    if (d < bestD) {
      bestD = d;
      best = { value: v[axis], source: "align", ref: v };
    }
  }

  return best;
}
