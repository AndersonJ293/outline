import { describe, expect, it } from "vitest";
import type { Entity, SketchImage, ViewportState } from "../../types";
import {
  hitTestEntity,
  hitTestEntityWithPoint,
  hitTestImage,
  hitTestImageHandle,
  hitTestSplineHandle,
  selectEntitiesInRect,
} from "./hitTest";

const viewport: ViewportState = { offsetX: 0, offsetY: 0, zoom: 1 };

const entities: Entity[] = [
  {
    id: "rect",
    type: "rectangle",
    closed: true,
    points: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
      { x: 0, y: 40 },
    ],
  },
];

const image: SketchImage = {
  id: "image",
  type: "image",
  x: 10,
  y: 20,
  widthMm: 40,
  heightMm: 20,
  source: "data:image/png;base64,",
  rotation: 0,
  mirrorX: false,
  mirrorY: false,
  opacity: 0.4,
};

describe("sketch hit testing", () => {
  it("hits entity points and line segments", () => {
    expect(hitTestEntity(entities, { x: 0, y: 0 }, viewport)).toBe("rect");
    expect(hitTestEntity(entities, { x: 20, y: 2 }, viewport)).toBe("rect");
    expect(hitTestEntity(entities, { x: 80, y: 80 }, viewport)).toBeNull();
  });

  it("hits images by bounding box", () => {
    expect(hitTestImage([image], { x: 10, y: 20 })).toBe("image");
    expect(hitTestImage([image], { x: -20, y: 20 })).toBeNull();
  });

  it("detects image resize handles", () => {
    const zoomedViewport = { ...viewport, zoom: 10 };
    expect(hitTestImageHandle(image, { x: 30, y: 30 }, zoomedViewport)).toBe("corner-br");
    expect(hitTestImageHandle(image, { x: 10, y: 10 }, zoomedViewport)).toBe("edge-t");
    expect(hitTestImageHandle(image, { x: 10, y: 20 }, zoomedViewport)).toBeNull();
  });

  it("selects entities with points inside a rectangular area", () => {
    expect(selectEntitiesInRect(entities, { x: -5, y: -5 }, { x: 5, y: 5 })).toEqual(["rect"]);
    expect(selectEntitiesInRect(entities, { x: 50, y: 50 }, { x: 60, y: 60 })).toEqual([]);
  });

  describe("hitTestEntityWithPoint", () => {
    it("returns a point hit with pointIndex when near a vertex", () => {
      expect(hitTestEntityWithPoint(entities, { x: 0, y: 0 }, viewport)).toEqual({
        kind: "point",
        entityId: "rect",
        pointIndex: 0,
      });
      expect(hitTestEntityWithPoint(entities, { x: 40, y: 40 }, viewport)).toEqual({
        kind: "point",
        entityId: "rect",
        pointIndex: 2,
      });
    });

    it("returns a segment hit with segIdx when near an edge", () => {
      expect(hitTestEntityWithPoint(entities, { x: 20, y: 2 }, viewport)).toEqual({
        kind: "segment",
        entityId: "rect",
        segIdx: 0,
      });
    });

    it("prefers a point hit over a segment hit when both are in range", () => {
      const cornerArea = { x: 1, y: 0 };
      expect(hitTestEntityWithPoint(entities, cornerArea, viewport)).toEqual({
        kind: "point",
        entityId: "rect",
        pointIndex: 0,
      });
    });

    it("returns null when far from any entity", () => {
      expect(hitTestEntityWithPoint(entities, { x: 80, y: 80 }, viewport)).toBeNull();
    });

    it("picks the nearest curve when two overlap within tolerance, not the first in the array", () => {
      // A tight offset pair: clicking right on the inner edge must not fall
      // back to the outer curve just because it was created first.
      const outer: Entity = {
        id: "outer",
        type: "circle",
        closed: true,
        center: { x: 0, y: 0 },
        radiusMm: 100,
        points: [],
      };
      const inner: Entity = {
        id: "inner",
        type: "circle",
        closed: true,
        center: { x: 0, y: 0 },
        radiusMm: 95,
        points: [],
      };
      const hit = hitTestEntityWithPoint([outer, inner], { x: 95, y: 0 }, viewport);
      expect(hit).toEqual({ kind: "segment", entityId: "inner", segIdx: 0 });
    });
  });

  describe("hitTestSplineHandle", () => {
    const spline: Entity = {
      id: "spl",
      type: "spline",
      closed: false,
      points: [],
      controlPoints: [
        { point: { x: 0, y: 0 }, handleOut: { dx: 5, dy: 0 } },
        { point: { x: 20, y: 0 }, handleOut: { dx: 5, dy: 0 } },
      ],
      samplingSteps: 8,
    };

    it("hits the handle endpoint of anchor 0", () => {
      expect(hitTestSplineHandle(spline, { x: 5, y: 0 }, viewport)).toEqual({
        entityId: "spl",
        anchorIndex: 0,
      });
    });

    it("ignores plain polylines", () => {
      expect(hitTestSplineHandle(entities[0], { x: 0, y: 0 }, viewport)).toBeNull();
    });

    it("returns null when far from any handle", () => {
      expect(hitTestSplineHandle(spline, { x: 50, y: 50 }, viewport)).toBeNull();
    });
  });
});
