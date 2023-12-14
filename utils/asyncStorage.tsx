import AsyncStorage from "@react-native-async-storage/async-storage";
import { LastSyncedInfo } from "./dataTypes";

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

const LastSyncedAtKey = "lastSyncedAt";
interface LastSyncedRemoteInfo {
  lastSyncedAt: string | null;
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
