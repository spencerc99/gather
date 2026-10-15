// ABOUTME: Combines custom-grid and system photo selections in selection order.
// ABOUTME: Excludes saved or staged assets while retaining assets without library identifiers.
import type { ImagePickerAsset } from "expo-image-picker";
import type { Asset } from "expo-media-library";

export type PhotoSelection = Asset | ImagePickerAsset;

export function mergePhotoSelections(
  selections: PhotoSelection[],
  excludedIds: ReadonlySet<string>,
): PhotoSelection[] {
  const seenIds = new Set(excludedIds);
  const seenUris = new Set<string>();
  return selections.filter((asset) => {
    const id = "mediaType" in asset ? asset.id : asset.assetId;
    if ((id && seenIds.has(id)) || seenUris.has(asset.uri)) return false;
    if (id) seenIds.add(id);
    seenUris.add(asset.uri);
    return true;
  });
}
