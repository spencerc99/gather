import AsyncStorage from "@react-native-async-storage/async-storage";
import { LastSyncedInfo } from "./dataTypes";
import { useCallback, useEffect, useState } from "react";

const LastSyncedAtKey = "lastSyncedAt";
interface LastSyncedRemoteInfo {
  lastSyncedAt: string | null;
}
export const CollectionToReviewKey = "collectionToReview";

export async function getLastSyncedInfoForChannel(
  channelId: string
): Promise<LastSyncedInfo | null> {
  const info = await AsyncStorage.getItem(channelId);
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

export async function updateLastSyncedInfoForChannel(
  channelId: string,
  lastSyncedInfo: LastSyncedInfo | null
): Promise<void> {
  await AsyncStorage.setItem(channelId, JSON.stringify(lastSyncedInfo));
}

export async function getLastSyncedRemoteInfo(): Promise<LastSyncedRemoteInfo> {
  const info = await AsyncStorage.getItem(LastSyncedAtKey);
  return info === null
    ? { lastSyncedAt: null }
    : (JSON.parse(info) as LastSyncedRemoteInfo);
}
export async function updateLastSyncedRemoteInfo(): Promise<void> {
  await AsyncStorage.setItem(
    LastSyncedAtKey,
    JSON.stringify({
      lastSyncedAt: new Date().toISOString(),
    })
  );
}
export async function getItem<T = any>(key: string): Promise<T | null> {
  return await AsyncStorage.getItem(key).then((data) =>
    data ? (JSON.parse(data) as T) : null
  );
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function useStickyValue<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  useEffect(() => {
    getItem<T>(key).then((data) => {
      if (data) {
        setValue(data);
      }
    });
  }, [key]);
  const setAndPersistValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      void setItem(key, newValue);
    },
    [key]
  );
  return [value, setAndPersistValue] as const;
}
