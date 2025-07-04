import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

// Task identifiers
export const BACKGROUND_TASK_NAMES = {
  CLOUD_BACKUP: "background-cloud-backup",
  ARENA_SYNC: "background-arena-sync",
  GENERAL_SYNC: "background-general-sync",
} as const;

export type BackgroundTaskName = keyof typeof BACKGROUND_TASK_NAMES;

// Task handler interface
export interface BackgroundTaskHandler {
  name: string;
  handler: () => Promise<BackgroundFetch.BackgroundFetchResult>;
  shouldRun: () => Promise<boolean>;
  minimumInterval?: number; // in minutes
}

// Central registry for background tasks
class BackgroundTaskRegistry {
  private static instance: BackgroundTaskRegistry;
  private handlers: Map<string, BackgroundTaskHandler> = new Map();
  private registeredTasks: Set<string> = new Set();

  static getInstance(): BackgroundTaskRegistry {
    if (!BackgroundTaskRegistry.instance) {
      BackgroundTaskRegistry.instance = new BackgroundTaskRegistry();
    }
    return BackgroundTaskRegistry.instance;
  }

  registerHandler(handler: BackgroundTaskHandler): void {
    this.handlers.set(handler.name, handler);
    console.log(`Registered background task handler: ${handler.name}`);
  }

  unregisterHandler(name: string): void {
    this.handlers.delete(name);
    console.log(`Unregistered background task handler: ${name}`);
  }

  getHandler(name: string): BackgroundTaskHandler | undefined {
    return this.handlers.get(name);
  }

  getAllHandlers(): BackgroundTaskHandler[] {
    return Array.from(this.handlers.values());
  }

  markTaskAsRegistered(taskName: string): void {
    this.registeredTasks.add(taskName);
  }

  markTaskAsUnregistered(taskName: string): void {
    this.registeredTasks.delete(taskName);
  }

  isTaskRegistered(taskName: string): boolean {
    return this.registeredTasks.has(taskName);
  }
}

// Get the singleton instance
const registry = BackgroundTaskRegistry.getInstance();

// Define the main background task that orchestrates all sub-tasks
TaskManager.defineTask(BACKGROUND_TASK_NAMES.GENERAL_SYNC, async () => {
  try {
    console.log("[Background] General sync task triggered");

    const handlers = registry.getAllHandlers();
    let hasNewData = false;
    let hasFailures = false;

    for (const handler of handlers) {
      try {
        const shouldRun = await handler.shouldRun();

        if (!shouldRun) {
          console.log(
            `[Background] Skipping ${handler.name}: shouldRun returned false`
          );
          continue;
        }

        console.log(`[Background] Running ${handler.name}`);
        const result = await handler.handler();

        if (result === BackgroundFetch.BackgroundFetchResult.NewData) {
          hasNewData = true;
        } else if (result === BackgroundFetch.BackgroundFetchResult.Failed) {
          hasFailures = true;
        }

        console.log(
          `[Background] ${handler.name} completed with result: ${result}`
        );
      } catch (error) {
        console.error(`[Background] ${handler.name} failed:`, error);
        hasFailures = true;
      }
    }

    if (hasFailures && !hasNewData) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    } else if (hasNewData) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error("[Background] General sync task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundTaskManager {
  private static isMainTaskRegistered = false;

  static registerHandler(handler: BackgroundTaskHandler): void {
    registry.registerHandler(handler);
  }

  static unregisterHandler(name: string): void {
    registry.unregisterHandler(name);
  }

  static async enableBackgroundSync(): Promise<boolean> {
    try {
      if (this.isMainTaskRegistered) {
        return true;
      }

      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        console.log("[Background] Background fetch is restricted");
        return false;
      }

      // Register the main background task
      await BackgroundFetch.registerTaskAsync(
        BACKGROUND_TASK_NAMES.GENERAL_SYNC,
        {
          minimumInterval: 60 * 60 * 6, // 6 hours minimum interval
          stopOnTerminate: false,
          startOnBoot: true,
        }
      );

      this.isMainTaskRegistered = true;
      registry.markTaskAsRegistered(BACKGROUND_TASK_NAMES.GENERAL_SYNC);
      console.log("[Background] Main background task registered successfully");
      return true;
    } catch (error) {
      console.error(
        "[Background] Failed to register main background task:",
        error
      );
      return false;
    }
  }

  static async disableBackgroundSync(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(
        BACKGROUND_TASK_NAMES.GENERAL_SYNC
      );
      this.isMainTaskRegistered = false;
      registry.markTaskAsUnregistered(BACKGROUND_TASK_NAMES.GENERAL_SYNC);
      console.log("[Background] Main background task unregistered");
    } catch (error) {
      console.error(
        "[Background] Failed to unregister main background task:",
        error
      );
    }
  }

  static async isBackgroundSyncEnabled(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_TASK_NAMES.GENERAL_SYNC
      );
      this.isMainTaskRegistered = isRegistered;
      registry.markTaskAsRegistered(BACKGROUND_TASK_NAMES.GENERAL_SYNC);
      return isRegistered;
    } catch (error) {
      console.error(
        "[Background] Failed to check background task registration:",
        error
      );
      return false;
    }
  }

  static async getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
    return BackgroundFetch.getStatusAsync();
  }

  static getRegisteredHandlers(): BackgroundTaskHandler[] {
    return registry.getAllHandlers();
  }
}

// Export the registry for direct access if needed
export { BackgroundTaskRegistry };
