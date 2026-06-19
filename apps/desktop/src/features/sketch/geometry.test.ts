import { describe, expect, it } from "vitest";
import { distanceToSegment, getSnapStep, rectanglePoints, screenToWorld, snapToGrid, worldToScreen } from "./geometry";
import type { ViewportState } from "../../types";

const viewport: ViewportState = { offsetX: 100, offsetY: 50, zoom: 2 };

describe("sketch geometry helpers", () => {
  it("converts between screen and world coordinates", () => {
    const rect = { left: 10, top: 20 } as DOMRect;
    const world = screenToWorld(150, 110, rect, viewport);

    expect(world).toEqual({ x: 20, y: 20 });
    expect(worldToScreen(world, viewport)).toEqual({ x: 140, y: 90 });
  });

  it("snaps points to the configured grid", () => {
    expect(snapToGrid({ x: 14, y: 26 }, 10)).toEqual({ x: 10, y: 30 });
    expect(snapToGrid({ x: -6, y: -14 }, 10)).toEqual({ x: -10, y: -10 });
  });

  it("snaps points using fractional steps (1mm precision)", () => {
    expect(snapToGrid({ x: 0.74, y: 0.3 }, 1)).toEqual({ x: 1, y: 0 });
    expect(snapToGrid({ x: 0.26, y: 1.6 }, 0.5)).toEqual({ x: 0.5, y: 1.5 });
  });

  it("does not snap when step is non-positive", () => {
    expect(snapToGrid({ x: 14, y: 26 }, 0)).toEqual({ x: 14, y: 26 });
  });

  it("scales the snap step inversely with zoom", () => {
    expect(getSnapStep(1)).toBe(10);
    expect(getSnapStep(2)).toBe(5);
    expect(getSnapStep(5)).toBe(2);
    expect(getSnapStep(10)).toBe(1);
    expect(getSnapStep(20)).toBe(0.5);
    expect(getSnapStep(0.5)).toBe(20);
    expect(getSnapStep(0.2)).toBe(50);
  });

  it("builds rectangle points from any diagonal", () => {
    expect(rectanglePoints({ x: 40, y: 20 }, { x: 10, y: 50 })).toEqual([
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 50 },
      { x: 10, y: 50 },
    ]);
  });

  it("measures distance to a segment including endpoints", () => {
    expect(distanceToSegment({ x: 5, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(4);
    expect(distanceToSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });
});
