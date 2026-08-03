// ABOUTME: Verifies virtualized grid positions use row-based offsets.
// ABOUTME: Covers items within a row and across row boundaries.
import { describe, expect, test } from "bun:test";
import { getGridItemLayout } from "./gridLayout";

describe("getGridItemLayout", () => {
  test("places every item in a row at the same offset", () => {
    expect(getGridItemLayout(100, 3, 3, 0).offset).toBe(0);
    expect(getGridItemLayout(100, 3, 3, 1).offset).toBe(0);
    expect(getGridItemLayout(100, 3, 3, 2).offset).toBe(0);
  });

  test("advances once per completed row", () => {
    expect(getGridItemLayout(100, 3, 3, 3).offset).toBe(106);
    expect(getGridItemLayout(100, 3, 3, 8).offset).toBe(212);
  });
});
