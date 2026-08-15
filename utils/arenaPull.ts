// ABOUTME: Pulls new Are.na collection items through injected network, storage, and database services.
// ABOUTME: Shares freshness, cursor, and lease behavior between foreground and background execution.
import type { RawArenaChannelItem } from "./arena";
import { DatabaseBlockInsert, LastSyncedInfo } from "./dataTypes";

export const ArenaPullFreshnessMs = 6 * 60 * 60 * 1000;
export const ArenaPullLeaseDurationMs = 30 * 60 * 1000;

export interface ArenaPullCollection {
  id: string;
  title: string;
  updatedAt: Date;
  channelId: string;
}

export interface ArenaPullStore {
  getCollections(): Promise<ArenaPullCollection[]>;
  getLastRemoteItem(
    collectionId: string,
  ): Promise<{ arenaId: string; connectedAt: string } | null>;
  updateCollectionTitle(collectionId: string, title: string): Promise<void>;
  getExistingArenaIds(arenaIds: string[]): Promise<Set<string>>;
  insertBlocks(
    collectionId: string,
    blocks: DatabaseBlockInsert[],
  ): Promise<number>;
}

export interface ArenaPullClient {
  getChannel(
    channelId: string,
    accessToken: string,
  ): Promise<{ title: string; updatedAt: string }>;
  getItems(
    channelId: string,
    accessToken: string,
    lastSyncedInfo: LastSyncedInfo | null,
  ): Promise<RawArenaChannelItem[]>;
  isGatherUpload(item: RawArenaChannelItem): boolean;
  toBlockInserts(items: RawArenaChannelItem[]): DatabaseBlockInsert[];
}

export interface ArenaPullState {
  getLastSuccessfulAt(): string | null;
  setLastSuccessfulAt(date: Date): void;
  getChannelCursor(channelId: string): LastSyncedInfo | null;
  setChannelCursor(channelId: string, cursor: LastSyncedInfo): void;
  acquireLease(now: Date, durationMs: number): string | null;
  releaseLease(leaseId: string): void;
}

export interface ArenaPullResult {
  status: "completed" | "skipped";
  skippedReason?:
    | "no-token"
    | "token-unavailable"
    | "recent"
    | "in-progress";
  collectionsAttempted: number;
  collectionsCompleted: number;
  itemsAdded: number;
  collectionsUpdated: number;
  requests: number;
}

export async function runArenaPull({
  accessToken,
  client,
  store,
  state,
  now = new Date(),
  freshnessMs = ArenaPullFreshnessMs,
}: {
  accessToken: string;
  client: ArenaPullClient;
  store: ArenaPullStore;
  state: ArenaPullState;
  now?: Date;
  freshnessMs?: number;
}): Promise<ArenaPullResult> {
  const lastSuccessfulAt = state.getLastSuccessfulAt();
  if (
    lastSuccessfulAt &&
    now.getTime() - new Date(lastSuccessfulAt).getTime() < freshnessMs
  ) {
    return emptyResult("recent");
  }

  const leaseId = state.acquireLease(now, ArenaPullLeaseDurationMs);
  if (!leaseId) {
    return emptyResult("in-progress");
  }

  try {
    const collections = await store.getCollections();
    const result: ArenaPullResult = {
      status: "completed",
      collectionsAttempted: collections.length,
      collectionsCompleted: 0,
      itemsAdded: 0,
      collectionsUpdated: 0,
      requests: 0,
    };

    for (const collection of collections) {
      let cursor = state.getChannelCursor(collection.channelId);
      if (!cursor) {
        const lastRemoteItem = await store.getLastRemoteItem(collection.id);
        if (lastRemoteItem) {
          cursor = {
            lastSyncedAt: now.toISOString(),
            lastSyncedBlockCreatedAt: lastRemoteItem.connectedAt,
            lastSyncedBlockId: lastRemoteItem.arenaId,
          };
        }
      }

      const channel = await client.getChannel(
        collection.channelId,
        accessToken,
      );
      result.requests += 1;
      if (
        channel.title !== collection.title &&
        new Date(channel.updatedAt).getTime() > collection.updatedAt.getTime()
      ) {
        await store.updateCollectionTitle(collection.id, channel.title);
        result.collectionsUpdated += 1;
      }

      const descendingItems = await client.getItems(
        collection.channelId,
        accessToken,
        cursor,
      );
      result.requests += 1;
      const items = [...descendingItems].reverse();
      const arenaIds = items.map((item) => item.id.toString());
      const existingArenaIds = await store.getExistingArenaIds(arenaIds);
      const itemsToInsert = items.filter((item) => {
        const uploadedByGather = client.isGatherUpload(item);
        return !uploadedByGather || existingArenaIds.has(item.id.toString());
      });

      if (itemsToInsert.length > 0) {
        result.itemsAdded += await store.insertBlocks(
          collection.id,
          client.toBlockInserts(itemsToInsert),
        );
      }

      const latestItem = items[items.length - 1];
      if (latestItem) {
        state.setChannelCursor(collection.channelId, {
          lastSyncedAt: now.toISOString(),
          lastSyncedBlockCreatedAt: latestItem.connected_at,
          lastSyncedBlockId: latestItem.id,
        });
      }
      result.collectionsCompleted += 1;
    }

    state.setLastSuccessfulAt(now);
    return result;
  } finally {
    state.releaseLease(leaseId);
  }
}

function emptyResult(
  skippedReason: ArenaPullResult["skippedReason"],
): ArenaPullResult {
  return {
    status: "skipped",
    skippedReason,
    collectionsAttempted: 0,
    collectionsCompleted: 0,
    itemsAdded: 0,
    collectionsUpdated: 0,
    requests: 0,
  };
}
