import { describe, it, expect } from "vitest";
import type { Entity, Project, ViewportState } from "../../types";
import {
  applyLinearDimension,
  measureSegment,
  dimensionLayout,
  closestPointOnEntity,
  offsetDimensionLayout,
  isOffsetResult,
  dependentOffsetEntityIds,
  isPointConnected,
  hitTestDimension,
  applyConnectionConstraints,
  diameterDimensionLayout,
} from "./dimensions";

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

function circle(id: string, radiusMm: number): Entity {
  return {
    id,
    type: "circle",
    center: { x: 0, y: 0 },
    radiusMm,
    points: [
      { x: radiusMm, y: 0 },
      { x: 0, y: radiusMm },
      { x: -radiusMm, y: 0 },
      { x: 0, y: -radiusMm },
    ],
    closed: true,
  };
}

describe("closestPointOnEntity", () => {
  it("projects analytically onto a circle", () => {
    const c = circle("c1", 10);
    const p = closestPointOnEntity(c, { x: 5, y: 5 });
    expect(p).not.toBeNull();
    expect(Math.hypot(p!.x, p!.y)).toBeCloseTo(10);
  });

  it("finds the nearest point on a polyline segment", () => {
    const e = rect();
    const p = closestPointOnEntity(e, { x: 4, y: 100 });
    expect(p).toEqual({ x: 4, y: 5 });
  });
});

describe("offsetDimensionLayout", () => {
  it("connects concentric circles along a shared radial direction", () => {
    const source = circle("inner", 10);
    const offset = circle("outer", 14);
    const layout = offsetDimensionLayout(source, offset);
    expect(layout).not.toBeNull();
    expect(Math.hypot(layout!.a.x, layout!.a.y)).toBeCloseTo(10);
    expect(Math.hypot(layout!.b.x, layout!.b.y)).toBeCloseTo(14);
    // Both anchors sit on the same ray from the shared center.
    const angleA = Math.atan2(layout!.a.y, layout!.a.x);
    const angleB = Math.atan2(layout!.b.y, layout!.b.x);
    expect(angleA).toBeCloseTo(angleB);
  });

  it("spreads anchors of different source ids to different angles", () => {
    const a = offsetDimensionLayout(circle("chain-a", 10), circle("out-a", 12));
    const b = offsetDimensionLayout(circle("chain-b", 10), circle("out-b", 12));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    // Different source ids should (almost always) fan out to different rays.
    expect(a!.a).not.toEqual(b!.a);
  });
});

function projectWithOffset(): Project {
  return {
    version: 1,
    units: "mm",
    project_name: "p",
    sketch: {
      plane: "XY",
      entities: [circle("source", 10), circle("result", 14)],
      dimensions: [
        { id: "d1", kind: "offset", entityId: "source", offsetEntityId: "result", value: 4 },
      ],
    },
    operations: [],
  };
}

describe("isOffsetResult / dependentOffsetEntityIds", () => {
  it("flags the generated curve, not the source", () => {
    const p = projectWithOffset();
    expect(isOffsetResult(p, "result")).toBe(true);
    expect(isOffsetResult(p, "source")).toBe(false);
  });

  it("lists dependents of the source curve", () => {
    const p = projectWithOffset();
    expect(dependentOffsetEntityIds(p, "source")).toEqual(["result"]);
    expect(dependentOffsetEntityIds(p, "result")).toEqual([]);
  });
});

describe("isPointConnected", () => {
  it("is true when a line's endpoint sits on a circle's boundary", () => {
    const c = circle("c1", 10);
    const touchingLine: Entity = {
      id: "l1",
      type: "polyline",
      closed: false,
      points: [
        { x: 10, y: 0 }, // exactly on c1's boundary (angle 0)
        { x: 20, y: 0 },
      ],
    };
    expect(isPointConnected([c, touchingLine], "l1", { x: 10, y: 0 })).toBe(true);
  });

  it("is false for a free endpoint touching nothing", () => {
    const c = circle("c1", 10);
    const freeLine: Entity = {
      id: "l1",
      type: "polyline",
      closed: false,
      points: [
        { x: 100, y: 100 },
        { x: 110, y: 100 },
      ],
    };
    expect(isPointConnected([c, freeLine], "l1", { x: 100, y: 100 })).toBe(false);
  });
});

describe("applyConnectionConstraints", () => {
  it("glides a connected endpoint along the curve it touches instead of detaching", () => {
    const c = circle("c1", 10);
    const line: Entity = {
      id: "l1",
      type: "polyline",
      closed: false,
      points: [
        { x: 10, y: 0 }, // connected to c1's boundary (angle 0)
        { x: 20, y: 0 },
      ],
    };
    // Drag the connected endpoint toward (0, 20) — a raw move would detach it.
    const dragged = [{ x: 0, y: 20 }, { x: 20, y: 0 }];
    const result = applyConnectionConstraints([c, line], line, dragged);
    // It should land back on c1's boundary, nearest the dragged position.
    expect(Math.hypot(result[0].x, result[0].y)).toBeCloseTo(10);
    // The unconnected endpoint is left untouched.
    expect(result[1]).toEqual({ x: 20, y: 0 });
  });

  it("leaves free points untouched", () => {
    const c = circle("c1", 10);
    const line: Entity = {
      id: "l1",
      type: "polyline",
      closed: false,
      points: [
        { x: 100, y: 100 },
        { x: 110, y: 100 },
      ],
    };
    const dragged = [{ x: 50, y: 50 }, { x: 110, y: 100 }];
    const result = applyConnectionConstraints([c, line], line, dragged);
    expect(result).toEqual(dragged);
  });
});

describe("diameterDimensionLayout", () => {
  it("places both endpoints on the circle boundary, on opposite sides", () => {
    const c = circle("c1", 10);
    const layout = diameterDimensionLayout(c, {
      id: "d1",
      kind: "diameter",
      entityId: "c1",
      value: 20,
      angle: 0,
    });
    expect(layout).not.toBeNull();
    expect(layout!.a).toEqual({ x: -10, y: 0 });
    expect(layout!.b).toEqual({ x: 10, y: 0 });
    expect(layout!.center).toEqual({ x: 0, y: 0 });
  });

  it("follows the requested angle", () => {
    const c = circle("c1", 10);
    const layout = diameterDimensionLayout(c, {
      id: "d1",
      kind: "diameter",
      entityId: "c1",
      value: 20,
      angle: Math.PI / 2,
    });
    expect(layout!.a.x).toBeCloseTo(0);
    expect(layout!.a.y).toBeCloseTo(-10);
    expect(layout!.b.x).toBeCloseTo(0);
    expect(layout!.b.y).toBeCloseTo(10);
  });
});

describe("hitTestDimension", () => {
  it("picks the nearer offset annotation when two leader lines sit close together", () => {
    const viewport: ViewportState = { offsetX: 0, offsetY: 0, zoom: 1 };
    const line = (id: string, x: number): Entity => ({
      id,
      type: "polyline",
      closed: false,
      points: [
        { x, y: 0 },
        { x: x + 10, y: 0 },
      ],
    });
    const offsetLine = (id: string, x: number): Entity => ({
      id,
      type: "polyline",
      closed: false,
      points: [
        { x, y: 5 },
        { x: x + 10, y: 5 },
      ],
    });

    const project: Project = {
      version: 1,
      units: "mm",
      project_name: "p",
      // dim2 (the farther annotation) is listed first on purpose — a
      // first-match hit test would wrongly prefer it over the nearer dim1.
      sketch: {
        plane: "XY",
        entities: [line("s2", 1), offsetLine("o2", 1), line("s1", 0), offsetLine("o1", 0)],
        dimensions: [
          { id: "dim2", kind: "offset", entityId: "s2", offsetEntityId: "o2", value: 5 },
          { id: "dim1", kind: "offset", entityId: "s1", offsetEntityId: "o1", value: 5 },
        ],
      },
      operations: [],
    };

    // Closer to dim1's leader line (x=0) than dim2's (x=1).
    const hit = hitTestDimension(project, { x: 0.3, y: 2.5 }, viewport);
    expect(hit).toBe("dim1");
  });
});
