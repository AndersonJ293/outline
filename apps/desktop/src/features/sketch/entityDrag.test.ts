import { describe, expect, it } from "vitest";
import type { Entity, Point } from "../../types";
import {
  applyEntityMove,
  applyPointMove,
  applySegmentMove,
  reflectEntity,
  reflectPointAcrossLine,
  translateEntityVertices,
  translateEntityWhole,
} from "./entityDrag";

const rect: Entity = {
  id: "rect",
  type: "rectangle",
  closed: true,
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};

const line: Entity = {
  id: "line",
  type: "polyline",
  closed: false,
  points: [
    { x: -5, y: -5 },
    { x: 0, y: 0 },
    { x: 5, y: 5 },
    { x: 10, y: 10 },
  ],
};

const circle: Entity = {
  id: "circle",
  type: "circle",
  closed: true,
  center: { x: 10, y: 20 },
  radiusMm: 5,
  points: [
    { x: 15, y: 20 },
    { x: 10, y: 25 },
    { x: 5, y: 20 },
    { x: 10, y: 15 },
  ],
};

describe("entityDrag", () => {
  describe("applyPointMove", () => {
    it("moves only the targeted point by the delta", () => {
      const start: Point = { x: 10, y: 10 };
      const world: Point = { x: 13, y: 7 };
      const result = applyPointMove(rect, 2, world, start);
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 13, y: 7 },
        { x: 0, y: 10 },
      ]);
    });

    it("returns the original points when pointIndex is out of range", () => {
      const start: Point = { x: 0, y: 0 };
      const world: Point = { x: 5, y: 5 };
      expect(applyPointMove(rect, -1, world, start)).toEqual(rect.points);
      expect(applyPointMove(rect, 99, world, start)).toEqual(rect.points);
    });

    it("is a no-op when world equals start", () => {
      const start: Point = { x: 1, y: 1 };
      expect(applyPointMove(line, 1, start, start)).toEqual(line.points);
    });
  });

  describe("applySegmentMove", () => {
    it("moves only the two endpoints of the segment", () => {
      const start: Point = { x: 0, y: 0 };
      const world: Point = { x: 2, y: 3 };
      const result = applySegmentMove(line, 1, world, start);
      expect(result).toEqual([
        { x: -5, y: -5 },
        { x: 2, y: 3 },
        { x: 7, y: 8 },
        { x: 10, y: 10 },
      ]);
    });

    it("leaves points outside the segment untouched so the rest of the polyline stays put", () => {
      const start: Point = { x: 0, y: 0 };
      const world: Point = { x: 10, y: 0 };
      const result = applySegmentMove(line, 2, world, start);
      expect(result[0]).toEqual({ x: -5, y: -5 });
      expect(result[1]).toEqual({ x: 0, y: 0 });
      expect(result[2]).toEqual({ x: 15, y: 5 });
      expect(result[3]).toEqual({ x: 20, y: 10 });
    });

    it("moves both endpoints of the closing segment in a closed polyline", () => {
      const start: Point = { x: 10, y: 10 };
      const world: Point = { x: 12, y: 13 };
      const result = applySegmentMove(rect, 3, world, start);
      expect(result).toEqual([
        { x: 2, y: 3 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 2, y: 13 },
      ]);
    });

    it("returns the original points when segIdx is out of range", () => {
      const start: Point = { x: 0, y: 0 };
      const world: Point = { x: 5, y: 5 };
      expect(applySegmentMove(line, -1, world, start)).toEqual(line.points);
      expect(applySegmentMove(line, 99, world, start)).toEqual(line.points);
    });
  });

  describe("applyEntityMove", () => {
    it("translates every point by the same delta", () => {
      const start: Point = { x: 0, y: 0 };
      const world: Point = { x: 3, y: 4 };
      const result = applyEntityMove(rect, world, start);
      expect(result).toEqual([
        { x: 3, y: 4 },
        { x: 13, y: 4 },
        { x: 13, y: 14 },
        { x: 3, y: 14 },
      ]);
    });

    it("is a no-op when world equals start", () => {
      const start: Point = { x: 1, y: 1 };
      expect(applyEntityMove(rect, start, start)).toEqual(rect.points);
    });

    it("preserves the relative geometry (segment lengths and angles)", () => {
      const start: Point = { x: 0, y: 0 };
      const world: Point = { x: 7, y: -2 };
      const result = applyEntityMove(line, world, start);
      const d0 = distance(result[0], result[1]);
      const d1 = distance(result[1], result[2]);
      const d2 = distance(result[2], result[3]);
      expect(d0).toBeCloseTo(distance(line.points[0], line.points[1]));
      expect(d1).toBeCloseTo(distance(line.points[1], line.points[2]));
      expect(d2).toBeCloseTo(distance(line.points[2], line.points[3]));
    });
  });

  describe("translateEntityWhole", () => {
    it("shifts every point by the delta", () => {
      const result = translateEntityWhole(line, 3, -4);
      expect(result.points).toEqual([
        { x: -2, y: -9 },
        { x: 3, y: -4 },
        { x: 8, y: 1 },
        { x: 13, y: 6 },
      ]);
    });

    it("moves a circle center and regenerates sampled points without changing radius", () => {
      const result = translateEntityWhole(circle, 3, -4);
      expect(result.center).toEqual({ x: 13, y: 16 });
      expect(result.radiusMm).toBe(5);
      expect(result.points[0]).toEqual({ x: 18, y: 16 });
    });
  });

  describe("translateEntityVertices", () => {
    it("moves only the listed indices", () => {
      const result = translateEntityVertices(rect, new Set([1, 2]), 5, 0);
      expect(result.points).toEqual([
        { x: 0, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 10 },
        { x: 0, y: 10 },
      ]);
    });

    it("treats the circle center as the only editable vertex", () => {
      const result = translateEntityVertices(circle, new Set([0]), -2, 6);
      expect(result.center).toEqual({ x: 8, y: 26 });
      expect(result.radiusMm).toBe(5);
    });
  });

  describe("reflectPointAcrossLine", () => {
    it("reflects across a vertical line x=0", () => {
      const r = reflectPointAcrossLine({ x: 3, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 1 });
      expect(r.x).toBeCloseTo(-3);
      expect(r.y).toBeCloseTo(5);
    });
    it("keeps points on the axis fixed", () => {
      const r = reflectPointAcrossLine({ x: 0, y: 7 }, { x: 0, y: 0 }, { x: 0, y: 1 });
      expect(r.x).toBeCloseTo(0);
      expect(r.y).toBeCloseTo(7);
    });
  });

  describe("reflectEntity", () => {
    it("mirrors points and assigns the new id", () => {
      const r = reflectEntity(line, { x: 0, y: 0 }, { x: 0, y: 1 }, "new");
      expect(r.id).toBe("new");
      expect(r.points.map((p) => p.x)).toEqual([5, 0, -5, -10]);
      expect(r.points.map((p) => p.y)).toEqual([-5, 0, 5, 10]);
    });

    it("mirrors a circle by moving only its center and preserving radius", () => {
      const r = reflectEntity(circle, { x: 0, y: 0 }, { x: 0, y: 1 }, "cm");
      expect(r.id).toBe("cm");
      expect(r.type).toBe("circle");
      expect(r.center).toEqual({ x: -10, y: 20 });
      expect(r.radiusMm).toBe(5);
      expect(r.points[0]).toEqual({ x: -5, y: 20 });
    });

    it("reflects spline anchors and handle vectors", () => {
      const spline: Entity = {
        id: "s",
        type: "spline",
        closed: false,
        samplingSteps: 8,
        points: [],
        controlPoints: [
          { point: { x: 2, y: 0 }, handleOut: { dx: 1, dy: 2 } },
          { point: { x: 6, y: 0 }, handleOut: { dx: -1, dy: 1 } },
        ],
      };
      const r = reflectEntity(spline, { x: 0, y: 0 }, { x: 0, y: 1 }, "sm");
      const cps = r.controlPoints!;
      expect(cps[0].point.x).toBeCloseTo(-2);
      // handleOut dx flips sign across the vertical axis, dy is preserved.
      expect(cps[0].handleOut.dx).toBeCloseTo(-1);
      expect(cps[0].handleOut.dy).toBeCloseTo(2);
      expect(r.points.length).toBeGreaterThan(0);
    });
  });
});

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
