import type { Entity, Point, Project } from "../../types";
import { pointDistance } from "../../types";
import { CLOSE_THRESHOLD } from "./constants";

const ENDPOINT_EPSILON = 0.001;

export interface Chain {
  rootEntityId: string;
  rootPoint: Point;
  segmentIds: string[];
}

export interface ChainContour {
  points: Point[];
  closed: boolean;
}

let chainsCacheProject: Project | undefined;
let chainsCacheResult: Chain[] | undefined;

export function computeChainsMemo(project: Project | null): Chain[] {
  if (!project) {
    chainsCacheProject = undefined;
    chainsCacheResult = undefined;
    return [];
  }
  if (project === chainsCacheProject && chainsCacheResult) return chainsCacheResult;
  chainsCacheProject = project;
  chainsCacheResult = computeChains(project);
  return chainsCacheResult;
}

function isOpenPath(entity: Entity): boolean {
  if (entity.closed) return false;
  return entity.type === "polyline" || entity.type === "spline";
}

export function endpointOf(entity: Entity, end: "start" | "end"): Point {
  const idx = end === "start" ? 0 : entity.points.length - 1;
  return entity.points[idx];
}

function pointsEqual(a: Point, b: Point): boolean {
  return pointDistance(a, b) < ENDPOINT_EPSILON;
}

function sharesEndpoint(a: Entity, b: Entity): boolean {
  const aStart = endpointOf(a, "start");
  const aEnd = endpointOf(a, "end");
  const bStart = endpointOf(b, "start");
  const bEnd = endpointOf(b, "end");
  return (
    pointsEqual(aStart, bStart) ||
    pointsEqual(aStart, bEnd) ||
    pointsEqual(aEnd, bStart) ||
    pointsEqual(aEnd, bEnd)
  );
}

function findChainRoot(component: Entity[]): Entity {
  for (const entity of component) {
    const first = endpointOf(entity, "start");
    let isRoot = true;
    for (const other of component) {
      if (other.id === entity.id) continue;
      const otherStart = endpointOf(other, "start");
      const otherEnd = endpointOf(other, "end");
      if (pointsEqual(first, otherStart) || pointsEqual(first, otherEnd)) {
        isRoot = false;
        break;
      }
    }
    if (isRoot) return entity;
  }
  return component[0];
}

export function computeChains(project: Project | null): Chain[] {
  if (!project) return [];
  const openEntities = project.sketch.entities.filter(isOpenPath);

  const visited = new Set<string>();
  const chains: Chain[] = [];

  for (const entity of openEntities) {
    if (visited.has(entity.id)) continue;
    const component: Entity[] = [];
    const queue: Entity[] = [entity];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      component.push(current);
      for (const other of openEntities) {
        if (visited.has(other.id) || other.id === current.id) continue;
        if (sharesEndpoint(current, other)) {
          queue.push(other);
        }
      }
    }
    if (component.length === 0) continue;
    const root = findChainRoot(component);
    chains.push({
      rootEntityId: root.id,
      rootPoint: endpointOf(root, "start"),
      segmentIds: component.map((e) => e.id),
    });
  }

  return chains;
}

export function findChainAtPoint(
  point: Point,
  project: Project | null,
  zoom: number,
): Chain | null {
  if (!project) return null;
  const threshold = CLOSE_THRESHOLD / zoom;
  for (const chain of computeChains(project)) {
    if (pointDistance(point, chain.rootPoint) < threshold) {
      return chain;
    }
  }
  return null;
}

export function findChainForEntity(
  entity: Entity,
  project: Project | null,
): Chain | null {
  if (!project) return null;
  for (const chain of computeChains(project)) {
    if (chain.segmentIds.includes(entity.id)) {
      return chain;
    }
  }
  return null;
}

export function findOpenEndpointAt(
  point: Point,
  project: Project | null,
  zoom: number,
): { point: Point; entity: Entity; end: "start" | "end" } | null {
  if (!project) return null;
  const threshold = CLOSE_THRESHOLD / zoom;
  let best: { point: Point; entity: Entity; end: "start" | "end"; dist: number } | null = null;
  for (const entity of project.sketch.entities) {
    if (!isOpenPath(entity)) continue;
    const start = endpointOf(entity, "start");
    const distStart = pointDistance(point, start);
    if (distStart < threshold && (!best || distStart < best.dist)) {
      best = { point: start, entity, end: "start", dist: distStart };
    }
    const end = endpointOf(entity, "end");
    const distEnd = pointDistance(point, end);
    if (distEnd < threshold && (!best || distEnd < best.dist)) {
      best = { point: end, entity, end: "end", dist: distEnd };
    }
  }
  if (!best) return null;
  return { point: best.point, entity: best.entity, end: best.end };
}

function anchorsOf(entity: Entity): Point[] {
  if (entity.type === "spline" && entity.controlPoints) {
    return entity.controlPoints.map((cp) => cp.point);
  }
  return entity.points;
}

export interface AnchorHit {
  point: Point;
  entity: Entity | null;
}

export function findAnchorInOpenEntities(
  point: Point,
  drawingAnchors: Point[],
  project: Project | null,
  zoom: number,
): AnchorHit | null {
  const threshold = CLOSE_THRESHOLD / zoom;
  let bestPoint: Point | null = null;
  let bestEntity: Entity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const anchor of drawingAnchors) {
    const dist = pointDistance(point, anchor);
    if (dist < threshold && dist < bestDist) {
      bestPoint = anchor;
      bestEntity = null;
      bestDist = dist;
    }
  }
  if (project) {
    for (const entity of project.sketch.entities) {
      if (!isOpenPath(entity)) continue;
      for (const anchor of anchorsOf(entity)) {
        const dist = pointDistance(point, anchor);
        if (dist < threshold && dist < bestDist) {
          bestPoint = anchor;
          bestEntity = entity;
          bestDist = dist;
        }
      }
    }
  }

  if (!bestPoint) return null;
  return { point: bestPoint, entity: bestEntity };
}

interface DirectedEntity {
  entity: Entity;
  reversed: boolean;
}

function directedEndpoint(dir: DirectedEntity, end: "start" | "end"): Point {
  const pts = dir.entity.points;
  const isStart = end === "start";
  const pickStart = isStart !== dir.reversed;
  return pickStart ? pts[0] : pts[pts.length - 1];
}

function orderChainEntities(entities: Entity[]): DirectedEntity[] | null {
  if (entities.length === 0) return [];
  if (entities.length === 1) return [{ entity: entities[0], reversed: false }];

  const used = new Set<string>();
  const ordered: DirectedEntity[] = [];

  let start: DirectedEntity = { entity: entities[0], reversed: false };
  for (const entity of entities) {
    let chosen: DirectedEntity | null = null;
    for (const reversed of [false, true]) {
      const dir: DirectedEntity = { entity, reversed };
      const startPt = directedEndpoint(dir, "start");
      const isFree = !entities.some((other) => {
        if (other.id === entity.id) return false;
        return (
          pointsEqual(startPt, endpointOf(other, "start")) ||
          pointsEqual(startPt, endpointOf(other, "end"))
        );
      });
      if (isFree) {
        chosen = dir;
        break;
      }
    }
    if (chosen) {
      start = chosen;
      break;
    }
  }

  ordered.push(start);
  used.add(start.entity.id);

  let changed = true;
  while (changed && used.size < entities.length) {
    changed = false;
    const lastEnd = directedEndpoint(ordered[ordered.length - 1], "end");

    for (const entity of entities) {
      if (used.has(entity.id)) continue;
      if (pointsEqual(lastEnd, endpointOf(entity, "start"))) {
        ordered.push({ entity, reversed: false });
        used.add(entity.id);
        changed = true;
        break;
      }
      if (pointsEqual(lastEnd, endpointOf(entity, "end"))) {
        ordered.push({ entity, reversed: true });
        used.add(entity.id);
        changed = true;
        break;
      }
    }
    if (changed) continue;

    const firstStart = directedEndpoint(ordered[0], "start");
    for (const entity of entities) {
      if (used.has(entity.id)) continue;
      if (pointsEqual(firstStart, endpointOf(entity, "end"))) {
        ordered.unshift({ entity, reversed: false });
        used.add(entity.id);
        changed = true;
        break;
      }
      if (pointsEqual(firstStart, endpointOf(entity, "start"))) {
        ordered.unshift({ entity, reversed: true });
        used.add(entity.id);
        changed = true;
        break;
      }
    }
  }

  if (used.size !== entities.length) return null;
  return ordered;
}

export function chainContour(chain: Chain, project: Project): ChainContour | null {
  const entities = chain.segmentIds
    .map((id) => project.sketch.entities.find((e) => e.id === id))
    .filter((e): e is Entity => Boolean(e));
  if (entities.length === 0) return null;

  const ordered = orderChainEntities(entities);
  if (!ordered) return null;

  const points: Point[] = [];
  for (const dir of ordered) {
    const pts = dir.reversed ? [...dir.entity.points].reverse() : dir.entity.points;
    if (points.length === 0) {
      points.push(...pts);
    } else {
      const last = points[points.length - 1];
      if (pointsEqual(last, pts[0])) {
        points.push(...pts.slice(1));
      } else {
        points.push(...pts);
      }
    }
  }

  if (points.length < 2) return null;
  const closed = pointsEqual(points[0], points[points.length - 1]);
  if (closed && points.length > 1) {
    points.pop();
  }
  return { points, closed };
}

export function isClosedChain(chain: Chain, project: Project): boolean {
  const contour = chainContour(chain, project);
  return contour?.closed ?? false;
}
