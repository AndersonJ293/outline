import { useCallback, type MutableRefObject } from "react";
import type {
  Entity,
  Point,
  SplineControlPoint,
  ViewportState,
} from "../../../types";
import { generateId, pointDistance } from "../../../types";
import { CLOSE_THRESHOLD } from "../constants";
import { autoHandleFor, sampleSpline } from "../spline";

export interface SplineDrawingState {
  anchors: Point[];
  handleOuts: { dx: number; dy: number }[];
  closed: boolean;
}

interface UseSplineToolArgs {
  viewport: ViewportState;
  isDrawing: MutableRefObject<boolean>;
  splineState: MutableRefObject<SplineDrawingState | null>;
  addEntity: (entity: Entity) => void;
  setStatus: (text: string) => void;
}

const DEFAULT_STEPS = 64;

function buildSplineEntity(
  state: SplineDrawingState,
  steps: number,
): Entity {
  const controlPoints: SplineControlPoint[] = state.anchors.map((point, i) => ({
    point,
    handleOut: state.handleOuts[i] ?? { dx: 0, dy: 0 },
  }));
  const points = sampleSpline(controlPoints, steps, state.closed);
  return {
    id: generateId(),
    type: "spline",
    points,
    controlPoints,
    samplingSteps: steps,
    closed: state.closed,
  };
}

function rebuildHandles(
  anchors: Point[],
  handleOuts: { dx: number; dy: number }[],
): { dx: number; dy: number }[] {
  return anchors.map((anchor, i) =>
    autoHandleFor(anchors[i - 1] ?? null, anchor, anchors[i + 1] ?? null),
  );
}

export function useSplineTool({
  viewport,
  isDrawing,
  splineState,
  addEntity,
  setStatus,
}: UseSplineToolArgs) {
  const handleSplineMouseDown = useCallback(
    (snapped: Point): boolean => {
      if (!isDrawing.current) {
        isDrawing.current = true;
        splineState.current = {
          anchors: [snapped],
          handleOuts: [{ dx: 0, dy: 0 }],
          closed: false,
        };
        setStatus(
          `Spline: anchor 1 at (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`,
        );
        return true;
      }

      const state = splineState.current;
      if (!state) return false;

      const first = state.anchors[0];
      const distScreen = pointDistance(snapped, first) * viewport.zoom;
      if (distScreen < CLOSE_THRESHOLD && state.anchors.length >= 2) {
        state.closed = true;
        state.handleOuts = rebuildHandles(state.anchors, state.handleOuts);
        addEntity(buildSplineEntity(state, DEFAULT_STEPS));
        isDrawing.current = false;
        splineState.current = null;
        setStatus(
          `Spline closed: ${state.anchors.length} anchors, ${DEFAULT_STEPS} steps/span`,
        );
        return true;
      }

      state.anchors = [...state.anchors, snapped];
      state.handleOuts = rebuildHandles(state.anchors, state.handleOuts);
      setStatus(
        `Spline: anchor ${state.anchors.length} at (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`,
      );
      return true;
    },
    [addEntity, isDrawing, setStatus, splineState, viewport.zoom],
  );

  const finishSpline = useCallback(
    (close: boolean): boolean => {
      const state = splineState.current;
      if (!state) return false;
      if (state.anchors.length < 2) {
        isDrawing.current = false;
        splineState.current = null;
        return false;
      }
      state.closed = close;
      state.handleOuts = rebuildHandles(state.anchors, state.handleOuts);
      addEntity(buildSplineEntity(state, DEFAULT_STEPS));
      isDrawing.current = false;
      splineState.current = null;
      setStatus(
        `Spline ${close ? "closed" : "open"}: ${state.anchors.length} anchors, ${DEFAULT_STEPS} steps/span`,
      );
      return true;
    },
    [addEntity, isDrawing, setStatus, splineState],
  );

  const cancelSpline = useCallback((): boolean => {
    if (!isDrawing.current && !splineState.current) return false;
    isDrawing.current = false;
    splineState.current = null;
    return true;
  }, [isDrawing, splineState]);

  const popSplineAnchor = useCallback((): boolean => {
    const state = splineState.current;
    if (!state || state.anchors.length === 0) return false;
    if (state.anchors.length === 1) {
      isDrawing.current = false;
      splineState.current = null;
      setStatus("Spline cancelled");
      return true;
    }
    state.anchors = state.anchors.slice(0, -1);
    state.handleOuts = rebuildHandles(state.anchors, state.handleOuts);
    setStatus(
      `Spline: anchor ${state.anchors.length} remaining at (${state.anchors[state.anchors.length - 1].x.toFixed(1)}, ${state.anchors[state.anchors.length - 1].y.toFixed(1)})`,
    );
    return true;
  }, [isDrawing, setStatus, splineState]);

  return { handleSplineMouseDown, finishSpline, cancelSpline, popSplineAnchor };
}
