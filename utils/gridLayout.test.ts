// ABOUTME: Verifies virtualized grid positions use row-based offsets.
// ABOUTME: Covers items within a row and across row boundaries.
import { describe, expect, test } from "@jest/globals";
import { getGridRowLayout } from "./gridLayout";

describe("getGridRowLayout", () => {
  test("advances once per completed row", () => {
    expect(getGridRowLayout(100, 3, 0).offset).toBe(0);
    expect(getGridRowLayout(100, 3, 1).offset).toBe(106);
    expect(getGridRowLayout(100, 3, 2).offset).toBe(212);
  });
});
