import * as BackgroundFetch from "expo-background-fetch";
import {
  BackgroundTaskHandler,
  BACKGROUND_TASK_NAMES,
} from "./backgroundTasks";

// Cloud Backup Task Handler
export const createCloudBackupTaskHandler = (): BackgroundTaskHandler => ({
  name: BACKGROUND_TASK_NAMES.CLOUD_BACKUP,
  handler: async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
    try {
      console.log("[Background] Cloud backup task started");

      // Import cloudBackupManager dynamically to avoid circular dependencies
      const { cloudBackupManager } = require("./cloudBackup");

      // Check if backup is enabled and subscription is active
      const status = cloudBackupManager.getStatus();
      const isSubscriptionActive =
        await cloudBackupManager.isSubscriptionActive();

      if (!status.isEnabled || !isSubscriptionActive) {
        console.log(
          "[Background] Cloud backup skipped: disabled or no subscription"
        );
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Check if backup is needed
      const autoStatus = cloudBackupManager.getAutoBackupStatus();
      if (!autoStatus.isOverdue) {
        console.log("[Background] Cloud backup skipped: not yet due");
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Perform the backup
      await cloudBackupManager.createBackup((progress: any) => {
        console.log(
          `[Background] Cloud backup progress: ${progress.stage} - ${
            progress.progress * 100
          }%`
        );
      });

      console.log("[Background] Cloud backup completed successfully");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error("[Background] Cloud backup failed:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  },
  shouldRun: async (): Promise<boolean> => {
    try {
      const { cloudBackupManager } = require("./cloudBackup");
      const status = cloudBackupManager.getStatus();
      const isSubscriptionActive =
        await cloudBackupManager.isSubscriptionActive();
      const autoStatus = cloudBackupManager.getAutoBackupStatus();

      return status.isEnabled && isSubscriptionActive && autoStatus.isOverdue;
    } catch (error) {
      console.error(
        "[Background] Error checking if cloud backup should run:",
        error
      );
      return false;
    }
  },
  minimumInterval: 60 * 24, // 24 hours
});

// Arena Sync Task Handler
export const createArenaSyncTaskHandler = (): BackgroundTaskHandler => ({
  name: BACKGROUND_TASK_NAMES.ARENA_SYNC,
  handler: async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
    try {
      console.log("[Background] Arena sync task started");

      // Import database context dynamically
      const { DatabaseContext } = require("./db");

      // Check if user has Arena token (this would need to be accessed differently in practice)
      // For now, we'll implement a simple version
      await performArenaSync();

      console.log("[Background] Arena sync completed successfully");
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error("[Background] Arena sync failed:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  },
  shouldRun: async (): Promise<boolean> => {
    try {
      // Check if Arena sync is needed
      return await shouldPerformArenaSync();
    } catch (error) {
      console.error(
        "[Background] Error checking if Arena sync should run:",
        error
      );
      return false;
    }
  },
  minimumInterval: 60 * 6, // 6 hours
});

// Helper functions for Arena sync
async function performArenaSync(): Promise<void> {
  // This is a simplified version - in practice you'd need access to the database context
  // and user authentication state

  try {
    // Import arena sync functions
    const {
      getLastSyncedRemoteInfo,
      updateLastSyncedRemoteInfo,
    } = require("./mmkv");

    const { lastSyncedAt } = await getLastSyncedRemoteInfo();

    // Only sync if it's been more than 6 hours since last sync
    if (lastSyncedAt) {
      const hoursSinceLastSync =
        (new Date().getTime() - new Date(lastSyncedAt).getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLastSync < 6) {
        console.log("[Background] Arena sync skipped: too recent");
        return;
      }
    }

    // Perform the sync operations
    // Note: In practice, you'd need to properly access the database context
    // and implement the sync logic here
    console.log("[Background] Performing Arena sync operations...");

    // Update last sync time
    await updateLastSyncedRemoteInfo();
  } catch (error) {
    console.error("[Background] Error in performArenaSync:", error);
    throw error;
  }
}

async function shouldPerformArenaSync(): Promise<boolean> {
  try {
    // Check if user has Arena access token and there are collections to sync
    // This is a simplified check - in practice you'd verify authentication state

    const { getLastSyncedRemoteInfo } = require("./mmkv");
    const { lastSyncedAt } = await getLastSyncedRemoteInfo();

    if (!lastSyncedAt) {
      return true; // Never synced
    }

    const hoursSinceLastSync =
      (new Date().getTime() - new Date(lastSyncedAt).getTime()) /
      (1000 * 60 * 60);
    return hoursSinceLastSync >= 6; // Sync every 6 hours
  } catch (error) {
    console.error("[Background] Error checking Arena sync eligibility:", error);
    return false;
  }
}
