// ABOUTME: Converts nullable collection selections to values accepted by the select control.
// ABOUTME: Keeps the all-collections option distinct from an unselected control value.
export const AllCollectionsSelectValue = "__all_collections__";

export function collectionIdToSelectValue(collectionId: string | null): string {
  return collectionId ?? AllCollectionsSelectValue;
}

export function selectValueToCollectionId(value: string): string | null {
  return value === AllCollectionsSelectValue ? null : value;
}
