// ABOUTME: Verifies shared Are.na pulls advance cursors, honor freshness and leases, and persist only successful runs.
// ABOUTME: Uses stateful in-memory services so tests exercise the real pull orchestration without mocked calls.
import { describe, expect, it } from "@jest/globals";
import type { RawArenaChannelItem, RawArenaUser } from "./arena";
import {
  ArenaPullClient,
  ArenaPullCollection,
  ArenaPullState,
  ArenaPullStore,
  runArenaPull,
} from "./arenaPull";
import { RemoteSourceType } from "./dataTypes";
import type { DatabaseBlockInsert, LastSyncedInfo } from "./dataTypes";
import { BlockType } from "./mimeTypes";

class MemoryPullState implements ArenaPullState {
  lastSuccessfulAt: string | null = null;
  cursors = new Map<string, LastSyncedInfo>();
  activeLease: string | null = null;
  releasedLeases: string[] = [];

  getLastSuccessfulAt() {
    return this.lastSuccessfulAt;
  }

  setLastSuccessfulAt(date: Date) {
    this.lastSuccessfulAt = date.toISOString();
  }

  getChannelCursor(channelId: string) {
    return this.cursors.get(channelId) ?? null;
  }

  setChannelCursor(channelId: string, cursor: LastSyncedInfo) {
    this.cursors.set(channelId, cursor);
  }

  acquireLease() {
    if (this.activeLease) {
      return null;
    }
    this.activeLease = "lease";
    return this.activeLease;
  }

  releaseLease(leaseId: string) {
    if (this.activeLease === leaseId) {
      this.releasedLeases.push(leaseId);
      this.activeLease = null;
    }
  }
}

class MemoryPullStore implements ArenaPullStore {
  collections: ArenaPullCollection[] = [];
  lastRemoteItems = new Map<
    string,
    { arenaId: string; connectedAt: string }
  >();
  existingArenaIds = new Set<string>();
  insertedBlocks: DatabaseBlockInsert[] = [];
  titleUpdates: Array<{ collectionId: string; title: string }> = [];

  async getCollections() {
    return this.collections;
  }

  async getLastRemoteItem(collectionId: string) {
    return this.lastRemoteItems.get(collectionId) ?? null;
  }

  async updateCollectionTitle(collectionId: string, title: string) {
    this.titleUpdates.push({ collectionId, title });
  }

  async getExistingArenaIds(arenaIds: string[]) {
    return new Set(arenaIds.filter((id) => this.existingArenaIds.has(id)));
  }

  async insertBlocks(_collectionId: string, blocks: DatabaseBlockInsert[]) {
    this.insertedBlocks.push(...blocks);
    return blocks.length;
  }
}

class MemoryPullClient implements ArenaPullClient {
  channel = {
    title: "Remote title",
    updatedAt: "2026-08-11T12:00:00.000Z",
  };
  items: RawArenaChannelItem[] = [];
  error: Error | null = null;

  async getChannel() {
    if (this.error) {
      throw this.error;
    }
    return this.channel;
  }

  async getItems() {
    return this.items;
  }

  isGatherUpload(item: RawArenaChannelItem) {
    return item.description === "gather-upload";
  }

  toBlockInserts(items: RawArenaChannelItem[]): DatabaseBlockInsert[] {
    return items.map((item) => ({
      title: item.title,
      content: item.content,
      type: BlockType.Text,
      createdBy: "Arena:::tester",
      remoteSourceType: RemoteSourceType.Arena,
      remoteSourceInfo: { arenaId: item.id, arenaClass: "Block" as const },
      remoteConnectedAt: item.connected_at,
      connectedBy: "Arena:::tester",
    }));
  }
}

describe("runArenaPull", () => {
  it("skips a recent successful pull before acquiring a lease", async () => {
    const state = new MemoryPullState();
    state.lastSuccessfulAt = "2026-08-11T11:00:00.000Z";

    const result = await runArenaPull({
      accessToken: "token",
      client: new MemoryPullClient(),
      store: new MemoryPullStore(),
      state,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "skipped",
      skippedReason: "recent",
      requests: 0,
    });
    expect(state.releasedLeases).toEqual([]);
  });

  it("skips while another pull holds the lease", async () => {
    const state = new MemoryPullState();
    state.activeLease = "other-run";

    const result = await runArenaPull({
      accessToken: "token",
      client: new MemoryPullClient(),
      store: new MemoryPullStore(),
      state,
    });

    expect(result.skippedReason).toBe("in-progress");
    expect(state.activeLease).toBe("other-run");
  });

  it("imports remote items and advances the cursor past filtered Gather uploads", async () => {
    const state = new MemoryPullState();
    const store = new MemoryPullStore();
    store.collections = [
      {
        id: "collection-1",
        title: "Local title",
        updatedAt: new Date("2026-08-10T12:00:00.000Z"),
        channelId: "channel-1",
      },
    ];
    const client = new MemoryPullClient();
    client.items = [
      makeItem({
        id: "gather-upload",
        connectedAt: "2026-08-11T11:00:00.000Z",
        description: "gather-upload",
      }),
      makeItem({
        id: "remote-item",
        connectedAt: "2026-08-11T10:00:00.000Z",
        description: "remote",
      }),
    ];
    const now = new Date("2026-08-11T12:00:00.000Z");

    const result = await runArenaPull({
      accessToken: "token",
      client,
      store,
      state,
      now,
    });

    expect(result).toEqual({
      status: "completed",
      collectionsAttempted: 1,
      collectionsCompleted: 1,
      itemsAdded: 1,
      collectionsUpdated: 1,
      requests: 2,
    });
    expect(store.insertedBlocks.map((block) => block.remoteSourceInfo?.arenaId))
      .toEqual(["remote-item"]);
    expect(store.titleUpdates).toEqual([
      { collectionId: "collection-1", title: "Remote title" },
    ]);
    expect(state.cursors.get("channel-1")?.lastSyncedBlockId).toBe(
      "gather-upload",
    );
    expect(state.lastSuccessfulAt).toBe(now.toISOString());
    expect(state.releasedLeases).toEqual(["lease"]);
  });

  it("releases the lease without recording success when a collection fails", async () => {
    const state = new MemoryPullState();
    const store = new MemoryPullStore();
    store.collections = [
      {
        id: "collection-1",
        title: "Local title",
        updatedAt: new Date("2026-08-10T12:00:00.000Z"),
        channelId: "channel-1",
      },
    ];
    const client = new MemoryPullClient();
    client.error = new Error("network failed");

    await expect(
      runArenaPull({ accessToken: "token", client, store, state }),
    ).rejects.toThrow("network failed");
    expect(state.lastSuccessfulAt).toBeNull();
    expect(state.releasedLeases).toEqual(["lease"]);
  });
});

function makeItem({
  id,
  connectedAt,
  description,
}: {
  id: string;
  connectedAt: string;
  description: string;
}): RawArenaChannelItem {
  return {
    id,
    title: id,
    content: id,
    created_at: connectedAt,
    updated_at: connectedAt,
    description,
    source: null,
    url: `https://www.are.na/block/${id}`,
    base_class: "Block",
    class: "Text",
    connected_at: connectedAt,
    connected_by_user_id: "1",
    connected_by_user_slug: "tester",
    user: { slug: "tester" } as RawArenaUser,
  };
}
