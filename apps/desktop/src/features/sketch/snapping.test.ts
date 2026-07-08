import { describe, it, expect } from "vitest";
import type { Entity, ViewportState } from "../../types";
import { computeSnap, type SnapContext } from "./snapping";

const viewport: ViewportState = { offsetX: 0, offsetY: 0, zoom: 1 };

function line(points: { x: number; y: number }[]): Entity {
  return { id: "e1", type: "polyline", points, closed: false };
}

function ctx(partial: Partial<SnapContext>): SnapContext {
  return {
    entities: [],
    viewport,
    gridEnabled: false,
    bypass: false,
    anchor: null,
    ...partial,
  };
}

describe("computeSnap", () => {
  it("returns the raw point when bypassed", () => {
    const r = computeSnap({ x: 3.3, y: 7.7 }, ctx({ bypass: true, gridEnabled: true }));
    expect(r.snapped).toBe(false);
    expect(r.point).toEqual({ x: 3.3, y: 7.7 });
  });

  it("snaps to a nearby endpoint", () => {
    const e = line([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    const r = computeSnap({ x: 10.5, y: 0.4 }, ctx({ entities: [e] }));
    expect(r.kind).toBe("endpoint");
    expect(r.point).toEqual({ x: 10, y: 0 });
    expect(r.marker).toEqual({ x: 10, y: 0 });
  });

  it("snaps to a segment midpoint", () => {
    const e = line([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    const r = computeSnap({ x: 50.3, y: 0.5 }, ctx({ entities: [e] }));
    expect(r.kind).toBe("midpoint");
    expect(r.point).toEqual({ x: 50, y: 0 });
  });

  it("infers a vertical line from the anchor", () => {
    const r = computeSnap({ x: 20.4, y: 50 }, ctx({ anchor: { x: 20, y: 0 } }));
    expect(r.kind).toBe("vertical");
    expect(r.point.x).toBeCloseTo(20);
    expect(r.point.y).toBeCloseTo(50);
    expect(r.guides).toHaveLength(1);
  });

  it("infers a horizontal line from the anchor", () => {
    const r = computeSnap({ x: 50, y: 0.4 }, ctx({ anchor: { x: 0, y: 0 } }));
    expect(r.kind).toBe("horizontal");
    expect(r.point.y).toBeCloseTo(0);
  });

  it("aligns to an existing vertex X without an anchor", () => {
    const e = line([{ x: 30, y: 0 }, { x: 40, y: 0 }]);
    const r = computeSnap({ x: 30.3, y: 99 }, ctx({ entities: [e] }));
    expect(r.kind).toBe("align");
    expect(r.point.x).toBeCloseTo(30);
  });

  it("falls back to the grid when enabled and nothing else snaps", () => {
    const r = computeSnap({ x: 11.2, y: 9.1 }, ctx({ gridEnabled: true }));
    expect(r.kind).toBe("grid");
  });

  it("snaps onto a circle's boundary so a new curve can connect to it", () => {
    const circle: Entity = {
      id: "c1",
      type: "circle",
      closed: true,
      center: { x: 0, y: 0 },
      radiusMm: 50,
      points: [],
    };
    // Just inside the circle's edge, far from its only vertex (the center).
    const r = computeSnap({ x: 49, y: 1 }, ctx({ entities: [circle] }));
    expect(r.kind).toBe("curve");
    expect(Math.hypot(r.point.x, r.point.y)).toBeCloseTo(50, 3);
  });
});
