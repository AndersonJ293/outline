import { describe, expect, it } from "vitest";
import type { Entity, SketchImage, ViewportState } from "../../types";
import { hitTestEntity, hitTestImage, hitTestImageHandle, selectEntitiesInRect } from "./hitTest";

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
});
