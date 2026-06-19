import { describe, expect, it } from "vitest";
import type { Point, SplineControlPoint } from "../../types";
import { autoHandleFor, evaluateBezier, sampleSpline } from "./spline";

function p(x: number, y: number): Point {
  return { x, y };
}

function cp(x: number, y: number, dx: number, dy: number): SplineControlPoint {
  return { point: p(x, y), handleOut: { dx, dy } };
}

describe("spline math", () => {
  describe("evaluateBezier", () => {
    it("returns p0 at t=0 and p3 at t=1", () => {
      const a = p(0, 0);
      const b = p(10, 0);
      const c = p(10, 10);
      const d = p(0, 10);
      expect(evaluateBezier(a, b, c, d, 0)).toEqual(a);
      expect(evaluateBezier(a, b, c, d, 1)).toEqual(d);
    });

    it("produces the expected midpoint for a straight line", () => {
      const a = p(0, 0);
      const d = p(10, 0);
      const mid = evaluateBezier(a, a, d, d, 0.5);
      expect(mid.x).toBeCloseTo(5, 6);
      expect(mid.y).toBeCloseTo(0, 6);
    });
  });

  describe("autoHandleFor", () => {
    it("averages the two neighbor directions when both exist", () => {
      const handle = autoHandleFor(p(0, 0), p(5, 0), p(10, 0));
      expect(handle.dx).toBeCloseTo(10 / 6, 6);
      expect(handle.dy).toBeCloseTo(0, 6);
    });

    it("falls back to the single neighbor on edge anchors", () => {
      const start = autoHandleFor(null, p(0, 0), p(10, 0));
      expect(start.dx).toBeCloseTo(10 / 3, 6);
      const end = autoHandleFor(p(0, 0), p(10, 0), null);
      expect(end.dx).toBeCloseTo(10 / 3, 6);
    });

    it("returns zero when there are no neighbors", () => {
      expect(autoHandleFor(null, p(0, 0), null)).toEqual({ dx: 0, dy: 0 });
    });
  });

  describe("sampleSpline", () => {
    it("returns the anchor for a single control point", () => {
      const out = sampleSpline([cp(3, 4, 0, 0)], 8, false);
      expect(out).toEqual([p(3, 4)]);
    });

    it("returns empty for zero control points", () => {
      expect(sampleSpline([], 8, false)).toEqual([]);
    });

    it("produces (steps + 1) points per open span", () => {
      const cps = [cp(0, 0, 0, 0), cp(10, 0, 0, 0), cp(10, 10, 0, 0)];
      const out = sampleSpline(cps, 4, false);
      expect(out).toHaveLength(2 * 4 + 1);
      expect(out[0]).toEqual(p(0, 0));
      expect(out[out.length - 1]).toEqual(p(10, 10));
    });

    it("wraps the loop for closed splines without duplicating the seam", () => {
      const cps = [cp(0, 0, 0, 0), cp(10, 0, 0, 0), cp(10, 10, 0, 0), cp(0, 10, 0, 0)];
      const out = sampleSpline(cps, 4, true);
      expect(out).toHaveLength(4 * 4);
    });

    it("coerces a steps value of 0 to 1", () => {
      const cps = [cp(0, 0, 0, 0), cp(10, 0, 0, 0)];
      const out = sampleSpline(cps, 0, false);
      expect(out.length).toBe(2);
    });
  });
});
