import { describe, it, expect } from "vitest";
import type { Entity } from "../../types";
import { applyLinearDimension, measureSegment, dimensionLayout } from "./dimensions";

function rect(): Entity {
  return {
    id: "e1",
    type: "rectangle",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ],
    closed: true,
  };
}

describe("measureSegment", () => {
  it("measures a closed segment with wraparound", () => {
    const e = rect();
    expect(measureSegment(e, 0)).toBeCloseTo(10);
    expect(measureSegment(e, 3)).toBeCloseTo(5); // last → first
  });

  it("returns null for an out-of-range index", () => {
    expect(measureSegment(rect(), 9)).toBeNull();
  });
});

describe("applyLinearDimension", () => {
  it("drives the segment to the requested length, anchoring the first endpoint", () => {
    const updates = applyLinearDimension(rect(), 0, 20);
    expect(updates).not.toBeNull();
    const pts = updates!.points!;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1].x).toBeCloseTo(20);
    expect(pts[1].y).toBeCloseTo(0);
  });

  it("downgrades a driven rectangle to a polyline", () => {
    const updates = applyLinearDimension(rect(), 0, 20);
    expect(updates!.type).toBe("polyline");
  });

  it("rejects non-positive values", () => {
    expect(applyLinearDimension(rect(), 0, 0)).toBeNull();
  });
});

describe("dimensionLayout", () => {
  it("offsets the dimension line perpendicular to the segment", () => {
    const e = rect();
    const layout = dimensionLayout(e, {
      id: "d1",
      kind: "linear",
      entityId: "e1",
      segIdx: 0,
      value: 10,
      offset: 4,
    });
    expect(layout).not.toBeNull();
    // Segment 0 runs along +x, so the perpendicular offset is along +y.
    expect(layout!.da.y).toBeCloseTo(4);
    expect(layout!.db.y).toBeCloseTo(4);
    expect(layout!.length).toBeCloseTo(10);
  });
});
