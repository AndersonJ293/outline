import { describe, expect, it } from "vitest";
import type { Mesh } from "../types";
import { mergeMeshes } from "./useExportActions";

describe("mergeMeshes", () => {
  it("combines multiple bodies and remaps triangle indices", () => {
    const a: Mesh = {
      id: "a",
      vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      triangles: [[0, 1, 2]],
    };
    const b: Mesh = {
      id: "b",
      vertices: [[0, 0, 1], [1, 0, 1], [0, 1, 1]],
      triangles: [[0, 2, 1]],
    };

    const merged = mergeMeshes([a, b]);

    expect(merged.vertices).toHaveLength(6);
    expect(merged.triangles).toEqual([[0, 1, 2], [3, 5, 4]]);
  });
});
