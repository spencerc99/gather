import { LastSyncedInfo } from "./dataTypes";
import { useCallback, useEffect, useState } from "react";
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV();

export const LastSyncedAtKey = "lastSyncedAt";
interface LastSyncedRemoteInfo {
  lastSyncedAt: string | null;
}
export const CollectionToReviewKey = "collectionToReview";
export const ContributionsKey = "contributions";
export const ArenaUpdatedBlocksKey = "arenaUpdatedBlocks";
export const ArenaUpdatedChannelsKey = "arenaUpdatedChannels";

export function getLastSyncedInfoForChannel(
  channelId: string
): LastSyncedInfo | null {
  const info = storage.getString(channelId);
  if (!info) {
    return null;
  }
  const parsed = JSON.parse(info);
  return {
    ...parsed,
    lastSyncedAt: parsed.lastSyncedAt,
    lastSyncedBlockCreatedAt: parsed.lastSyncedBlockCreatedAt,
  } as LastSyncedInfo;
}

export function updateLastSyncedInfoForChannel(
  channelId: string,
  lastSyncedInfo: LastSyncedInfo | null
): void {
  storage.set(channelId, JSON.stringify(lastSyncedInfo));
}

export function getLastSyncedRemoteInfo(): LastSyncedRemoteInfo {
  const info = storage.getString(LastSyncedAtKey);
  return !info
    ? { lastSyncedAt: null }
    : (JSON.parse(info) as LastSyncedRemoteInfo);
}
export function updateLastSyncedRemoteInfo(): void {
  storage.set(
    LastSyncedAtKey,
    JSON.stringify({
      lastSyncedAt: new Date().toISOString(),
    })
  );
}

export function getItem<T = any>(key: string): T | null {
  const data = storage.getString(key);

  return data ? (JSON.parse(data) as T) : null;
}

export function setItem<T>(key: string, value: T): void {
  storage.set(key, typeof value === "string" ? value : JSON.stringify(value));
}

export function removeItem(key: string): void {
  storage.delete(key);
}

export function useStickyValue<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  useEffect(() => {
    const data = getItem<T>(key);
    if (data !== null) {
      setValue(data);
    }
  }, [key]);
  const setAndPersistValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      setItem(key, newValue);
    },
    [key]
  );
  return [value, setAndPersistValue] as const;
}

export function getBoolean(key: string): boolean | undefined {
  return storage.getBoolean(key);
}
export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value);
}
