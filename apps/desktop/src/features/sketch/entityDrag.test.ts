import { describe, expect, it } from "vitest";
import type { Entity, Point } from "../../types";
import { applyEntityMove, applyPointMove, applySegmentMove } from "./entityDrag";

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
});

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
