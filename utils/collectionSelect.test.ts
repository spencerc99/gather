// ABOUTME: Verifies collection select values preserve collection IDs and all-collection selection.
// ABOUTME: Protects the string sentinel required by the select component contract.
import {
  AllCollectionsSelectValue,
  collectionIdToSelectValue,
  selectValueToCollectionId,
} from "./collectionSelect";

describe("collection select values", () => {
  it("uses a string value for all collections", () => {
    expect(collectionIdToSelectValue(null)).toBe(AllCollectionsSelectValue);
    expect(selectValueToCollectionId(AllCollectionsSelectValue)).toBeNull();
  });

  it("preserves collection IDs", () => {
    expect(collectionIdToSelectValue("42")).toBe("42");
    expect(selectValueToCollectionId("42")).toBe("42");
  });
});
