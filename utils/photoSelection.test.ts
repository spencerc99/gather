// ABOUTME: Verifies selection merging between the photo grid and system picker.
// ABOUTME: Covers ordering, duplicate suppression, and missing library identifiers.
import { expect, test } from "@jest/globals";
import { mergePhotoSelections, PhotoSelection } from "./photoSelection";

const grid = (id: string): PhotoSelection =>
  ({ id, uri: `ph://${id}`, mediaType: "photo" }) as PhotoSelection;
const native = (
  assetId: string | null,
  uri = `file://${assetId}`,
): PhotoSelection => ({ assetId, uri, width: 10, height: 10, type: "image" });

test("preserves order and removes saved, staged, and overlapping selections", () => {
  const first = grid("first");
  const last = native("last");
  expect(
    mergePhotoSelections(
      [first, native("first"), native("saved"), grid("staged"), last],
      new Set(["saved", "staged"]),
    ),
  ).toEqual([first, last]);
});

test("retains permission-limited assets without identifiers and deduplicates their URI", () => {
  const first = native(null, "file://one");
  const second = native(null, "file://two");
  expect(mergePhotoSelections([first, second, first], new Set())).toEqual([
    first,
    second,
  ]);
});
