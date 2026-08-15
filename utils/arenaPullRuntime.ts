// ABOUTME: Connects the shared Are.na pull runner to Gather's network client and persisted sync state.
// ABOUTME: Coordinates foreground and background pulls with one expiring lease and shared cursors.
import {
  ArenaPullClient,
  ArenaPullState,
} from "./arenaPull";
import {
  GatherArenaAttribution,
  getChannelInfo,
  getChannelItems,
  rawArenaBlocksToBlockInsertInfo,
} from "./arena";
import {
  getItem,
  getLastSyncedInfoForChannel,
  getLastSyncedRemoteInfo,
  removeItem,
  setItem,
  updateLastSyncedInfoForChannel,
  updateLastSyncedRemoteInfo,
} from "./mmkv";

const ArenaPullLeaseKey = "arenaPullLease";
export const ArenaBackgroundChangesKey = "arenaBackgroundChanges";
export const ArenaBackgroundStatusKey = "arenaBackgroundStatus";

interface ArenaPullLease {
  id: string;
  expiresAt: number;
}

export const arenaPullClient: ArenaPullClient = {
  async getChannel(channelId, accessToken) {
    const channel = await getChannelInfo(channelId, accessToken);
    return {
      title: channel.title,
      updatedAt: channel.updated_at,
    };
  },
  getItems(channelId, accessToken, lastSyncedInfo) {
    return getChannelItems(channelId, {
      accessToken,
      lastSyncedInfo,
    });
  },
  isGatherUpload(item) {
    return item.description?.startsWith(GatherArenaAttribution) ?? false;
  },
  toBlockInserts(items) {
    return rawArenaBlocksToBlockInsertInfo(items);
  },
};

export function createArenaPullState(): ArenaPullState {
  return {
    getLastSuccessfulAt() {
      return getLastSyncedRemoteInfo().lastSyncedAt;
    },
    setLastSuccessfulAt(date) {
      updateLastSyncedRemoteInfo(date);
    },
    getChannelCursor(channelId) {
      return getLastSyncedInfoForChannel(channelId);
    },
    setChannelCursor(channelId, cursor) {
      updateLastSyncedInfoForChannel(channelId, cursor);
    },
    acquireLease(now, durationMs) {
      const existing = getItem<ArenaPullLease>(ArenaPullLeaseKey);
      if (existing && existing.expiresAt > now.getTime()) {
        return null;
      }
      const id = `${now.getTime()}-${Math.random().toString(36).slice(2)}`;
      setItem<ArenaPullLease>(ArenaPullLeaseKey, {
        id,
        expiresAt: now.getTime() + durationMs,
      });
      return id;
    },
    releaseLease(leaseId) {
      const existing = getItem<ArenaPullLease>(ArenaPullLeaseKey);
      if (existing?.id === leaseId) {
        removeItem(ArenaPullLeaseKey);
      }
    },
  };
}

export function markArenaBackgroundChanges(): void {
  setItem(ArenaBackgroundChangesKey, true);
}

export function consumeArenaBackgroundChanges(): boolean {
  const hasChanges = getItem<boolean>(ArenaBackgroundChangesKey) === true;
  if (hasChanges) {
    removeItem(ArenaBackgroundChangesKey);
  }
  return hasChanges;
}
