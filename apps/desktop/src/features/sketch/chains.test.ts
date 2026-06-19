import { describe, it, expect } from "vitest";
import type { Entity, Point, Project } from "../../types";
import { generateId } from "../../types";
import {
  chainContour,
  computeChains,
  findAnchorInOpenEntities,
  findChainForEntity,
  findOpenEndpointAt,
  isClosedChain,
} from "./chains";

function polyline(points: Point[], closed = false): Entity {
  return {
    id: generateId(),
    type: "polyline",
    points,
    closed,
  };
}

function spline(points: Point[], closed = false): Entity {
  return {
    id: generateId(),
    type: "spline",
    points,
    closed,
    controlPoints: points.map((p) => ({ point: p, handleOut: { dx: 0, dy: 0 } })),
  };
}

function projectOf(entities: Entity[]): Project {
  return {
    version: 1,
    units: "mm",
    project_name: "test",
    sketch: { plane: "XY", entities },
    operations: [],
  };
}

describe("computeChains", () => {
  it("returns no chains for empty project", () => {
    expect(computeChains(null)).toEqual([]);
    expect(computeChains(projectOf([]))).toEqual([]);
  });

  it("ignores closed polylines", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], true);
    expect(computeChains(projectOf([p]))).toEqual([]);
  });

  it("forms a chain of one open polyline", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const p = polyline([a, b]);
    const chains = computeChains(projectOf([p]));
    expect(chains).toHaveLength(1);
    expect(chains[0].rootPoint).toEqual(a);
    expect(chains[0].segmentIds).toEqual([p.id]);
  });

  it("joins polyline and spline sharing an endpoint", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 20, y: 5 };
    const p = polyline([a, b]);
    const s = spline([b, c]);
    const chains = computeChains(projectOf([p, s]));
    expect(chains).toHaveLength(1);
    expect(chains[0].rootPoint).toEqual(a);
    expect(chains[0].segmentIds.sort()).toEqual([p.id, s.id].sort());
  });

  it("returns multiple chains for disconnected entities", () => {
    const a = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    const b = polyline([{ x: 100, y: 0 }, { x: 200, y: 0 }]);
    const chains = computeChains(projectOf([a, b]));
    expect(chains).toHaveLength(2);
  });
});

describe("findChainForEntity", () => {
  it("returns the chain containing the entity", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 20, y: 5 };
    const p = polyline([a, b]);
    const s = spline([b, c]);
    const project = projectOf([p, s]);
    expect(findChainForEntity(p, project)?.rootPoint).toEqual(a);
    expect(findChainForEntity(s, project)?.rootPoint).toEqual(a);
  });

  it("returns null for an entity not in any chain", () => {
    const p = polyline([{ x: 100, y: 100 }, { x: 200, y: 100 }]);
    const orphan = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    expect(findChainForEntity(orphan, projectOf([p]))).toBeNull();
  });
});

describe("findOpenEndpointAt", () => {
  it("detects endpoint at start of open polyline", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const p = polyline([a, b]);
    const hit = findOpenEndpointAt({ x: 1, y: 0 }, projectOf([p]), 1);
    expect(hit).not.toBeNull();
    expect(hit?.end).toBe("start");
    expect(hit?.entity.id).toBe(p.id);
  });

  it("detects endpoint at end of open polyline", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const p = polyline([a, b]);
    const hit = findOpenEndpointAt({ x: 10.5, y: 0 }, projectOf([p]), 1);
    expect(hit).not.toBeNull();
    expect(hit?.end).toBe("end");
  });

  it("ignores closed polylines", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], true);
    expect(findOpenEndpointAt({ x: 0, y: 0 }, projectOf([p]), 1)).toBeNull();
  });

  it("scales threshold by zoom (screen space)", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    const target = { x: 30, y: 0 };
    expect(findOpenEndpointAt(target, projectOf([p]), 1)).toBeNull();
    expect(findOpenEndpointAt(target, projectOf([p]), 0.5)).not.toBeNull();
  });
});

describe("findAnchorInOpenEntities", () => {
  it("returns null when no anchor is near", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    expect(
      findAnchorInOpenEntities({ x: 100, y: 100 }, [], projectOf([p]), 1),
    ).toBeNull();
  });

  it("finds a nearby anchor in the drawing", () => {
    const hit = findAnchorInOpenEntities(
      { x: 0.5, y: 0 },
      [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      null,
      1,
    );
    expect(hit?.point).toEqual({ x: 0, y: 0 });
    expect(hit?.entity).toBeNull();
  });

  it("finds a nearby anchor in an existing open polyline and reports the entity", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    const hit = findAnchorInOpenEntities(
      { x: 10.5, y: 0 },
      [],
      projectOf([p]),
      1,
    );
    expect(hit?.point).toEqual({ x: 10, y: 0 });
    expect(hit?.entity?.id).toBe(p.id);
  });

  it("finds a nearby anchor in a spline (controlPoints)", () => {
    const s = spline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);
    const hit = findAnchorInOpenEntities(
      { x: 9, y: 0 },
      [],
      projectOf([s]),
      1,
    );
    expect(hit?.point).toEqual({ x: 10, y: 0 });
    expect(hit?.entity?.id).toBe(s.id);
  });

  it("ignores closed entities", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], true);
    expect(
      findAnchorInOpenEntities({ x: 0, y: 0 }, [], projectOf([p]), 1),
    ).toBeNull();
  });

  it("prefers the closest anchor", () => {
    const p = polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]);
    const hit = findAnchorInOpenEntities(
      { x: 9.5, y: 0 },
      [],
      projectOf([p]),
      1,
    );
    expect(hit?.point).toEqual({ x: 10, y: 0 });
  });
});

describe("chainContour", () => {
  it("returns null for an empty chain", () => {
    const project = projectOf([]);
    const chain = { rootEntityId: "x", rootPoint: { x: 0, y: 0 }, segmentIds: [] };
    expect(chainContour(chain, project)).toBeNull();
  });

  it("builds an open contour for a single open polyline", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const p = polyline([a, b]);
    const project = projectOf([p]);
    const chain = computeChains(project)[0];
    expect(chainContour(chain, project)).toEqual({
      points: [a, b],
      closed: false,
    });
  });

  it("orders entities to form a single closed contour", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 20, y: 0 };
    const d = { x: 20, y: 10 };
    const e = { x: 0, y: 10 };
    const p = polyline([a, b, c]);
    const s = spline([c, d, e, a]);
    const project = projectOf([p, s]);
    const chain = computeChains(project)[0];
    expect(chainContour(chain, project)).toEqual({
      points: [a, b, c, d, e],
      closed: true,
    });
  });

  it("orders a reversed spline to close the chain", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 20, y: 0 };
    const e = { x: 10, y: 10 };
    const p = polyline([a, b, c]);
    const s = spline([a, e, c]);
    const project = projectOf([p, s]);
    const chain = computeChains(project)[0];
    expect(chainContour(chain, project)).toEqual({
      points: [a, b, c, e],
      closed: true,
    });
  });

  it("keeps an open chain open when endpoints do not meet", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 20, y: 5 };
    const p = polyline([a, b]);
    const s = spline([b, c]);
    const project = projectOf([p, s]);
    const chain = computeChains(project)[0];
    expect(chainContour(chain, project)).toEqual({
      points: [a, b, c],
      closed: false,
    });
  });
});

describe("isClosedChain", () => {
  it("returns true for a closed chain", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 10, y: 10 };
    const p = polyline([a, b]);
    const s = spline([b, c, a]);
    const project = projectOf([p, s]);
    const chain = computeChains(project)[0];
    expect(isClosedChain(chain, project)).toBe(true);
  });

  it("returns false for an open chain", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const c = { x: 20, y: 5 };
    const p = polyline([a, b]);
    const s = spline([b, c]);
    const project = projectOf([p, s]);
    const chain = computeChains(project)[0];
    expect(isClosedChain(chain, project)).toBe(false);
  });
});
