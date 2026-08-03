# iOS Photos album connections

Connect one Gather collection to one user-created album in iOS Photos. Gather imports photos and videos from the album and exports compatible collection items back to it.

## Scope

The first release should:

- Run on iOS only.
- Connect a Gather collection to one user-created Photos album.
- Import images and videos.
- Export image and video blocks that have readable local media.
- Ignore text, links without local media, audio, and documents.
- Sync album membership in both directions.
- Preserve the media in the Photos library when a block or collection connection is removed.

The first release should not:

- Sync item order. `expo-media-library` does not expose album ordering.
- Connect smart albums such as Recents or Favorites. They do not have the same write semantics as user-created albums.
- Delete media from the Photos library.
- Preserve the motion component of Live Photos. Import the still image and state this limitation in the connection UI.
- Download remote-only media automatically. This avoids unexpected network use and Photos-library writes. A later release can add an explicit download-and-export action.
- Support Android albums. Android album storage and copy behavior need a separate design.

## User flows

### Import an existing album

1. Open the external connection picker.
2. Choose **iOS Photos**.
3. Grant Photos access if needed.
4. Choose a user-created album.
5. Gather creates a collection with the album title.
6. Gather imports compatible assets and records the album connection.

### Connect an existing collection

1. Open a local collection.
2. Choose **Connect to iOS Photos**.
3. Select an existing album or create an album with the collection title.
4. Gather imports missing album assets.
5. Gather adds compatible local collection items to the album.
6. Gather reports imported, exported, skipped, and failed counts.

### Sync later changes

Gather reconciles the collection when:

- The user opens the connected collection.
- The app returns to the foreground after the Photos library changes.
- The user selects **Sync now**.

Do not promise periodic background sync. iOS does not guarantee that the app will run after every Photos change.

## Reconciliation rules

Use the Photos asset ID as the media identity. The existing `blocks.local_asset_id` field already stores this value.

For every connected collection, fetch all image and video asset IDs in the album and compare them with eligible local collection connections.

| State | Action |
| --- | --- |
| Asset is in Photos and its block is connected locally | Mark the connection synced. |
| Asset is in Photos but has no local block | Create the block and collection connection. |
| Asset is in Photos and the block exists in Gather elsewhere | Add the existing block to the connected collection. |
| Local media connection has never synced to Photos | Add the asset to the album, then mark the connection synced. |
| Previously synced asset is no longer in the album | Remove only the Gather collection connection. Keep the block and the Photos asset. |
| Local item is incompatible | Leave it in Gather and report it as skipped. |

`connections.remote_created_at` can distinguish an unsynced local connection from a previously synced album connection. It should represent the time Gather confirmed album membership. Reconciliation must use current membership sets, not timestamps, to detect changes.

When an eligible block has a readable Gather file but no `local_asset_id`, create a Photos asset, save the returned asset ID on the block, and add it to the album. This write should happen only after the user connects the collection or adds the block to an already connected collection.

## Data model

Add a Photos provider to `RemoteSourceType` and a collection payload:

```ts
interface PhotoAlbumCollectionInfo {
  albumId: string;
  albumTitle: string;
  platform: "ios";
  kind: "Album";
}
```

Keep Photos identity out of `blocks.remote_source_info`. A block can originate in Photos, appear in several Photos albums, and also sync to Are.na. `local_asset_id` is the Photos identity; the collection connection represents album membership.

The current model allows one external provider per collection. The first release should keep that constraint. Supporting Are.na and Photos on the same Gather collection requires a separate collection-to-provider table and should not be folded into this feature.

Before implementation, verify that `local_asset_id` can be made unique for non-null values. Reusing an existing block for the same Photos asset prevents duplicate Gather blocks when that asset appears in several albums.

## Provider boundary

Move provider-specific behavior behind a small collection-sync interface before adding Photos:

```ts
interface CollectionConnectionProvider {
  importCollection(sourceId: string): Promise<ImportResult>;
  reconcileCollection(collection: Collection): Promise<SyncResult>;
  addBlock(collection: Collection, block: Block): Promise<SyncItemResult>;
  removeBlock(collection: Collection, block: Block): Promise<void>;
}
```

Keep authentication and provider clients outside the database module:

- `utils/arena.ts` continues to own Are.na requests.
- A Photos client owns `expo-media-library` album and asset operations.
- `utils/db.tsx` coordinates local transactions and query invalidation.

Do not generalize unrelated Are.na behavior. Extract only the dispatch points needed by both providers: import, reconcile, add membership, and remove membership.

## Permissions and failure behavior

- Request Photos read/write access when the user selects the Photos provider, not during app startup.
- If access is limited, explain that Gather can sync only visible assets and offer the system control for selecting more photos.
- If the album was deleted, stop syncing and show **Relink album**. Do not create a replacement automatically.
- If an iCloud asset is unavailable locally, leave it pending and report it. Do not create an empty block.
- If one asset fails, continue the batch and return per-item failures.
- Never mark a connection synced until the Photos operation succeeds.
- Never delete an asset from the Photos library as part of collection reconciliation.

## UI changes

- Rename Are.na-only import entry points to **External connections**.
- Show **Are.na** and **iOS Photos** as provider choices on iOS.
- Add a Photos album picker that lists user-created albums and their asset counts.
- Show the connected provider and album title in collection details.
- Replace Are.na-specific advanced buttons with provider-neutral actions:
  - **Sync now**
  - **Resync all**
  - **Disconnect**
- Show the last result as exact counts: imported, exported, skipped, and failed.
- Explain that text and unsupported files remain only in Gather.

## Implementation sequence

1. Add pure reconciliation types and a planner that compares remote asset IDs with local blocks and connection sync state.
2. Add unit tests for the planner before touching Photos APIs.
3. Add the Photos provider type and typed collection payload.
4. Add a Photos client for permissions, album listing, paginated asset reads, asset creation, album membership, and membership removal.
5. Add the provider dispatch points in the database layer without changing Are.na behavior.
6. Add import and connect flows.
7. Reconcile on collection focus, foreground Photos changes, and **Sync now**.
8. Add visible result and failure reporting.
9. Validate on a physical iPhone before release.

## Required tests

Unit tests should cover:

- New Photos asset imported into Gather.
- Existing Gather block reused by `local_asset_id`.
- New local media exported to Photos.
- Previously synced asset removed from the album.
- Unsynced local item not mistaken for a remote deletion.
- Text and unsupported file types skipped.
- Duplicate Photos asset IDs across albums.
- Partial failures without marking failed connections synced.

Physical-device tests should cover:

- Full and limited Photos permissions.
- Importing JPEG, HEIC, PNG, GIF, MOV, and MP4 assets.
- An iCloud-only asset.
- A deleted or renamed album.
- Adding and removing an asset in Photos.
- Adding and removing a block in Gather.
- A single asset connected to several Gather collections.
- Relaunch and foreground reconciliation.
- A large video and an interrupted operation.

## Decisions needed before implementation

1. Confirm that one external provider per Gather collection is acceptable for the first release.
2. Confirm that remote-only Are.na images and videos should remain skipped instead of being downloaded into Photos.
3. Confirm that removing a photo from the connected iOS album should remove only its Gather collection connection.
4. Confirm that Live Photos can import as still images in the first release.
