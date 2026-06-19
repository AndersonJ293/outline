import type { Point, SplineControlPoint } from "../../types";

/// Evaluates a cubic Bezier at parameter t in [0, 1].
export function evaluateBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/// Returns a smooth tangent handle for the anchor at `curr`, given the
/// neighbors `prev` and `next`. Length is one third of the average segment
/// length, mirrored from the local chord. Edge anchors (open spline) fall back
/// to the direction of the single known neighbor.
export function autoHandleFor(
  prev: Point | null,
  curr: Point,
  next: Point | null,
): { dx: number; dy: number } {
  if (prev && next) {
    const dx = (next.x - prev.x) / 6;
    const dy = (next.y - prev.y) / 6;
    return { dx, dy };
  }
  if (prev && !next) {
    const dx = (curr.x - prev.x) / 3;
    const dy = (curr.y - prev.y) / 3;
    return { dx, dy };
  }
  if (!prev && next) {
    const dx = (next.x - curr.x) / 3;
    const dy = (next.y - curr.y) / 3;
    return { dx, dy };
  }
  return { dx: 0, dy: 0 };
}

/// Samples the spline as a dense polyline.
/// `steps` is the number of segments per anchor span (>= 1).
export function sampleSpline(
  controlPoints: SplineControlPoint[],
  steps: number,
  closed: boolean,
): Point[] {
  if (controlPoints.length === 0) return [];
  const safeSteps = Math.max(1, Math.floor(steps));
  const n = controlPoints.length;
  if (n === 1) return [{ ...controlPoints[0].point }];

  const result: Point[] = [];
  const spanCount = closed ? n : n - 1;
  if (spanCount <= 0) return [{ ...controlPoints[0].point }];

  for (let i = 0; i < spanCount; i++) {
    const curr = controlPoints[i];
    const next = controlPoints[(i + 1) % n];
    const p1 = {
      x: curr.point.x + curr.handleOut.dx,
      y: curr.point.y + curr.handleOut.dy,
    };
    const p2 = {
      x: next.point.x - next.handleOut.dx,
      y: next.point.y - next.handleOut.dy,
    };
    const start = i === 0 ? 0 : 1;
    const isLast = i === spanCount - 1;
    const end = isLast && closed ? safeSteps - 1 : safeSteps;
    if (end < start) continue;
    for (let s = start; s <= end; s++) {
      const t = s / safeSteps;
      result.push(evaluateBezier(curr.point, p1, p2, next.point, t));
    }
  }

  return result;
}
