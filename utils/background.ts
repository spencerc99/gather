// ABOUTME: Registers Gather's battery-aware background task for pulling new Are.na items.
// ABOUTME: Records aggregate diagnostics and exposes a development trigger for device validation.
import * as BackgroundTask from "expo-background-task";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { ArenaTokenStorageKey } from "./arena";
import { ArenaPullResult, runArenaPull } from "./arenaPull";
import {
  createArenaPullStore,
  openArenaPullDatabase,
} from "./arenaPullDatabase";
import {
  ArenaBackgroundStatusKey,
  arenaPullClient,
  createArenaPullState,
  markArenaBackgroundChanges,
} from "./arenaPullRuntime";
import { getItem, setItem } from "./mmkv";

export const ArenaBackgroundTaskName = "arena-background-pull-v1";
export const ArenaBackgroundMinimumIntervalMinutes = 12 * 60;

export interface ArenaBackgroundStatus {
  startedAt: string;
  completedAt: string;
  result?: ArenaPullResult;
  error?: string;
}

if (!TaskManager.isTaskDefined(ArenaBackgroundTaskName)) {
  TaskManager.defineTask(ArenaBackgroundTaskName, runArenaBackgroundPull);
}

export async function registerArenaBackgroundPullAsync(): Promise<boolean> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return false;
  }
  if (!(await TaskManager.isTaskRegisteredAsync(ArenaBackgroundTaskName))) {
    await BackgroundTask.registerTaskAsync(ArenaBackgroundTaskName, {
      minimumInterval: ArenaBackgroundMinimumIntervalMinutes,
    });
  }
  return true;
}

export async function unregisterArenaBackgroundPullAsync(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(ArenaBackgroundTaskName)) {
    await BackgroundTask.unregisterTaskAsync(ArenaBackgroundTaskName);
  }
}

export function getArenaBackgroundStatus(): ArenaBackgroundStatus | null {
  return getItem<ArenaBackgroundStatus>(ArenaBackgroundStatusKey);
}

export async function triggerArenaBackgroundPullForTestingAsync(): Promise<boolean> {
  return BackgroundTask.triggerTaskWorkerForTestingAsync();
}

async function runArenaBackgroundPull(): Promise<BackgroundTask.BackgroundTaskResult> {
  const startedAt = new Date();
  try {
    let accessToken: string | null;
    try {
      accessToken = await SecureStore.getItemAsync(ArenaTokenStorageKey);
    } catch (_error) {
      recordStatus(startedAt, emptySkippedResult("token-unavailable"));
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    if (!accessToken) {
      recordStatus(startedAt, emptySkippedResult("no-token"));
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const database = openArenaPullDatabase();
    const result = await runArenaPull({
      accessToken,
      client: arenaPullClient,
      store: createArenaPullStore(database),
      state: createArenaPullState(),
    }).finally(() => database.closeAsync());
    if (result.itemsAdded > 0 || result.collectionsUpdated > 0) {
      markArenaBackgroundChanges();
    }
    recordStatus(startedAt, result);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    setItem<ArenaBackgroundStatus>(ArenaBackgroundStatusKey, {
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
}

function recordStatus(startedAt: Date, result: ArenaPullResult): void {
  setItem<ArenaBackgroundStatus>(ArenaBackgroundStatusKey, {
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    result,
  });
}

function emptySkippedResult(
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
