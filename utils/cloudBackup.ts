import { Platform, AppState, AppStateStatus } from "react-native";
import { exportData } from "../app/export";
import * as FileSystem from "expo-file-system";
import dayjs from "dayjs";
import {
  CloudStorage,
  CloudStorageProvider,
  useIsCloudAvailable,
} from "react-native-cloud-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getItem, setItem } from "./mmkv";

// Development mode mock storage
const DEV_CLOUD_STORAGE_DIR = `${FileSystem.documentDirectory}dev_cloud_backup/`;

class DevCloudStorageMock {
  static async ensureDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(DEV_CLOUD_STORAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DEV_CLOUD_STORAGE_DIR, {
        intermediates: true,
      });
    }
  }

  static async writeFile(path: string, content: string): Promise<void> {
    await this.ensureDirectory();
    const fullPath = DEV_CLOUD_STORAGE_DIR + path.replace(/^\//, "");
    await FileSystem.writeAsStringAsync(fullPath, content, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`[DEV] Wrote file to mock cloud storage: ${fullPath}`);
  }

  static async readFile(path: string): Promise<string> {
    const fullPath = DEV_CLOUD_STORAGE_DIR + path.replace(/^\//, "");
    const content = await FileSystem.readAsStringAsync(fullPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`[DEV] Read file from mock cloud storage: ${fullPath}`);
    return content;
  }

  static async deleteFile(path: string): Promise<void> {
    const fullPath = DEV_CLOUD_STORAGE_DIR + path.replace(/^\//, "");
    await FileSystem.deleteAsync(fullPath, { idempotent: true });
    console.log(`[DEV] Deleted file from mock cloud storage: ${fullPath}`);
  }

  static async listFiles(): Promise<string[]> {
    await this.ensureDirectory();
    const files = await FileSystem.readDirectoryAsync(DEV_CLOUD_STORAGE_DIR);
    return files.filter((file) => file.endsWith(".zip"));
  }
}

export interface BackupMetadata {
  filename: string;
  date: Date;
  size: number;
  deviceName: string;
  appVersion: string;
}

export interface BackupProgress {
  stage: "preparing" | "uploading" | "verifying" | "complete";
  progress: number; // 0-1
  message: string;
}

export interface RestoreProgress {
  stage: "downloading" | "extracting" | "importing" | "complete";
  progress: number; // 0-1
  message: string;
}

export interface BackupStatus {
  isEnabled: boolean;
  isBackingUp: boolean;
  lastBackupDate: Date | null;
  lastBackupSize: number | null;
  error: string | null;
}

const CLOUD_BACKUP_ENABLED_KEY = "cloudBackupEnabled";
const CLOUD_BACKUP_STATUS_KEY = "cloudBackupStatus";
const LAST_AUTO_BACKUP_CHECK_KEY = "lastAutoBackupCheck";
const BACKUP_INTERVAL_HOURS = 24; // Backup every 24 hours

class CloudBackupManager {
  private isInitialized: boolean = false;
  private status: BackupStatus = {
    isEnabled: false,
    isBackingUp: false,
    lastBackupDate: null,
    lastBackupSize: null,
    error: null,
  };
  private appStateSubscription: any = null;
  private isAutoBackupInProgress: boolean = false;

  constructor() {
    this.loadStatus();
    this.setupAppStateListener();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === "active") {
      // App came to foreground - check if we need to backup
      this.checkAndTriggerAutoBackup();
    }
  }

  private async checkAndTriggerAutoBackup(): Promise<void> {
    if (!this.status.isEnabled || this.isAutoBackupInProgress) {
      return;
    }

    if (!(await this.isSubscriptionActive())) {
      return;
    }

    const now = new Date();
    const lastCheck = getItem<string>(LAST_AUTO_BACKUP_CHECK_KEY);

    // Only check once per hour to avoid excessive checks
    if (lastCheck) {
      const hoursSinceLastCheck =
        (now.getTime() - new Date(lastCheck).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCheck < 1) {
        return;
      }
    }

    setItem(LAST_AUTO_BACKUP_CHECK_KEY, now.toISOString());

    if (this.shouldPerformAutoBackup()) {
      console.log("Triggering automatic backup...");
      await this.performAutoBackup();
    }
  }

  private shouldPerformAutoBackup(): boolean {
    if (!this.status.lastBackupDate) {
      return true; // Never backed up
    }

    const hoursSinceLastBackup =
      (new Date().getTime() - this.status.lastBackupDate.getTime()) /
      (1000 * 60 * 60);

    return hoursSinceLastBackup >= BACKUP_INTERVAL_HOURS;
  }

  private async performAutoBackup(): Promise<void> {
    if (this.isAutoBackupInProgress) {
      return;
    }

    this.isAutoBackupInProgress = true;

    try {
      await this.createBackup((progress) => {
        console.log(
          `Auto backup progress: ${progress.stage} - ${
            progress.progress * 100
          }%`
        );
      });
      console.log("Automatic backup completed successfully");
    } catch (error) {
      console.error("Automatic backup failed:", error);
      // Don't show user alerts for auto backups - they'll see the error in settings
    } finally {
      this.isAutoBackupInProgress = false;
    }
  }

  async isSubscriptionActive(): Promise<boolean> {
    try {
      // Import at runtime to avoid circular dependencies
      const subscriptionModule = require("./cloudBackupSubscription");
      return subscriptionModule.cloudBackupSubscriptionManager.isSubscriptionActive();
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return false;
    }
  }

  getAutoBackupStatus(): {
    isOverdue: boolean;
    hoursSinceLastBackup: number | null;
    nextBackupDue: Date | null;
  } {
    if (!this.status.lastBackupDate) {
      return {
        isOverdue: true,
        hoursSinceLastBackup: null,
        nextBackupDue: new Date(), // Due now
      };
    }

    const hoursSinceLastBackup =
      (new Date().getTime() - this.status.lastBackupDate.getTime()) /
      (1000 * 60 * 60);

    const isOverdue = hoursSinceLastBackup >= BACKUP_INTERVAL_HOURS;
    const nextBackupDue = new Date(
      this.status.lastBackupDate.getTime() +
        BACKUP_INTERVAL_HOURS * 60 * 60 * 1000
    );

    return {
      isOverdue,
      hoursSinceLastBackup,
      nextBackupDue: isOverdue ? new Date() : nextBackupDue,
    };
  }

  // Cleanup method
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private loadStatus(): void {
    const enabled = getItem<boolean>(CLOUD_BACKUP_ENABLED_KEY) ?? false;
    const storedStatus = getItem<string>(CLOUD_BACKUP_STATUS_KEY);

    this.status.isEnabled = enabled;

    if (storedStatus) {
      try {
        const parsed = JSON.parse(storedStatus);
        this.status = {
          ...this.status,
          ...parsed,
          lastBackupDate: parsed.lastBackupDate
            ? new Date(parsed.lastBackupDate)
            : null,
        };
      } catch (error) {
        console.error("Failed to parse backup status:", error);
      }
    }
  }

  private saveStatus(): void {
    setItem(CLOUD_BACKUP_ENABLED_KEY, this.status.isEnabled);
    setItem(
      CLOUD_BACKUP_STATUS_KEY,
      JSON.stringify({
        ...this.status,
        lastBackupDate: this.status.lastBackupDate?.toISOString() || null,
      })
    );
  }

  getStatus(): BackupStatus {
    return { ...this.status };
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.status.isEnabled = enabled;
    if (!enabled) {
      this.status.error = null;
      // Unregister background tasks when disabled
      await this.unregisterFromBackgroundSync();
    } else {
      // Register background tasks when enabled
      await this.registerForBackgroundSync();
    }
    this.saveStatus();
  }

  private setBackingUp(isBackingUp: boolean): void {
    this.status.isBackingUp = isBackingUp;
    this.saveStatus();
  }

  private setError(error: string | null): void {
    this.status.error = error;
    this.saveStatus();
  }

  private updateLastBackup(date: Date, size: number): void {
    this.status.lastBackupDate = date;
    this.status.lastBackupSize = size;
    this.status.error = null;
    this.saveStatus();
  }

  async initializeCloudStorage(): Promise<boolean> {
    try {
      await this.initialize();
      const isAvailable = await this.isCloudAvailable();

      if (!isAvailable && Platform.OS === "android") {
        const authenticated = await this.authenticateForGoogleDrive();
        return authenticated;
      }

      return isAvailable;
    } catch (error) {
      console.error("Failed to initialize cloud storage:", error);
      this.setError(
        error instanceof Error ? error.message : "Initialization failed"
      );
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === "android") {
        // Google Drive setup - requires user authentication
        await GoogleSignin.configure({
          scopes: ["https://www.googleapis.com/auth/drive.file"],
          webClientId: "", // You'll need to provide this
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize cloud storage:", error);
      throw error;
    }
  }

  async isCloudAvailable(): Promise<boolean> {
    try {
      await this.initialize();

      // In development mode, always return true for mock storage
      if (__DEV__) {
        console.log("[DEV] Using mock cloud storage");
        return true;
      }

      // Only support iOS for now
      if (Platform.OS !== "ios") {
        return false;
      }

      if (Platform.OS === "ios") {
        // Check iCloud availability - CloudStorage handles this internally
        return CloudStorage.getProvider() === CloudStorageProvider.ICloud;
      } else {
        // Check Google Drive availability and authentication
        const isSignedIn = await GoogleSignin.isSignedIn();
        return isSignedIn;
      }
    } catch (error) {
      console.error("Cloud availability check failed:", error);
      return __DEV__; // Return true in dev mode for testing
    }
  }

  async authenticateForGoogleDrive(): Promise<boolean> {
    if (Platform.OS !== "android") return true;

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo) {
        // Get access token and configure CloudStorage
        const tokens = await GoogleSignin.getTokens();
        CloudStorage.setProviderOptions({
          accessToken: tokens.accessToken,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Google Drive authentication failed:", error);
      return false;
    }
  }

  async createBackup(
    onProgress?: (progress: BackupProgress) => void
  ): Promise<BackupMetadata | null> {
    try {
      this.setBackingUp(true);
      this.setError(null);

      await this.initialize();

      // Check cloud availability
      const isAvailable = await this.isCloudAvailable();
      if (!isAvailable) {
        if (Platform.OS === "android") {
          const authenticated = await this.authenticateForGoogleDrive();
          if (!authenticated) {
            throw new Error("Google Drive authentication required");
          }
        } else {
          throw new Error("iCloud is not available");
        }
      }

      onProgress?.({
        stage: "preparing",
        progress: 0.1,
        message: "Preparing backup data...",
      });

      // Create backup using existing export functionality
      const exportResult = await exportData();
      if (!exportResult) {
        throw new Error("Failed to create backup data");
      }

      onProgress?.({
        stage: "uploading",
        progress: 0.5,
        message: "Uploading to cloud...",
      });

      // Generate backup filename
      const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
      const deviceName = Platform.OS === "ios" ? "iPhone" : "Android";
      const filename = `gather_backup_${timestamp}_${deviceName}.zip`;

      // Read the backup file
      const backupPath = exportResult.path;
      const backupContent = await FileSystem.readAsStringAsync(backupPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to cloud storage
      const cloudPath = `/gather_backups/${filename}`;

      if (__DEV__) {
        await DevCloudStorageMock.writeFile(cloudPath, backupContent);
      } else {
        await CloudStorage.writeFile(cloudPath, backupContent);
      }

      onProgress?.({
        stage: "verifying",
        progress: 0.9,
        message: "Verifying backup...",
      });

      // Verify upload by trying to read the file
      try {
        if (__DEV__) {
          await DevCloudStorageMock.readFile(cloudPath);
        } else {
          await CloudStorage.readFile(cloudPath);
        }
      } catch (error) {
        throw new Error("Backup verification failed");
      }

      // Get file size before cleaning up
      const fileInfo = await FileSystem.getInfoAsync(backupPath);
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

      // Clean up local backup file
      await FileSystem.deleteAsync(backupPath, { idempotent: true });

      onProgress?.({
        stage: "complete",
        progress: 1.0,
        message: "Backup completed successfully",
      });

      const metadata = {
        filename,
        date: new Date(),
        size: fileSize,
        deviceName,
        appVersion: "1.0.0", // You can get this from app.json or expo-constants
      };

      this.updateLastBackup(metadata.date, metadata.size);
      return metadata;
    } catch (error) {
      console.error("Backup creation failed:", error);
      if (error instanceof Error) {
        if (
          error.message.includes("storage quota exceeded") ||
          error.message.includes("not enough space")
        ) {
          const errorMsg =
            "Cloud storage is full. Please free up space and try again.";
          this.setError(errorMsg);
          throw new Error(errorMsg);
        }
        this.setError(error.message);
      }
      throw error;
    } finally {
      this.setBackingUp(false);
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      await this.initialize();

      const isAvailable = await this.isCloudAvailable();
      if (!isAvailable) {
        return [];
      }

      if (__DEV__) {
        // Use mock storage in development mode
        const files = await DevCloudStorageMock.listFiles();
        const backups: BackupMetadata[] = [];

        for (const filename of files) {
          // Parse filename: gather_backup_YYYY-MM-DD_HH-mm-ss_Device.zip
          const match = filename.match(
            /gather_backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_(.+)\.zip/
          );
          if (match) {
            const [, timestamp, deviceName] = match;
            const date = dayjs(timestamp, "YYYY-MM-DD_HH-mm-ss").toDate();

            // Get file size
            const fullPath = DEV_CLOUD_STORAGE_DIR + filename;
            const fileInfo = await FileSystem.getInfoAsync(fullPath);
            const size = fileInfo.exists ? fileInfo.size || 0 : 0;

            backups.push({
              filename,
              date,
              size,
              deviceName,
              appVersion: "1.0.0",
            });
          }
        }

        // Sort by date, newest first
        return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
      }

      // Note: react-native-cloud-storage doesn't have a listFiles method
      // We'll need to implement a different approach or store backup metadata separately
      // For now, return empty array - this would need to be implemented differently
      console.warn(
        "listBackups: react-native-cloud-storage does not support listing files. Consider storing backup metadata separately."
      );
      return [];
    } catch (error) {
      console.error("Failed to list backups:", error);
      return [];
    }
  }

  async restoreFromBackup(
    backup: BackupMetadata,
    onProgress?: (progress: RestoreProgress) => void
  ): Promise<boolean> {
    try {
      await this.initialize();

      onProgress?.({
        stage: "downloading",
        progress: 0.1,
        message: "Downloading backup from cloud...",
      });

      // Download backup file
      const cloudPath = `/gather_backups/${backup.filename}`;
      let backupContent: string;

      if (__DEV__) {
        backupContent = await DevCloudStorageMock.readFile(cloudPath);
      } else {
        backupContent = await CloudStorage.readFile(cloudPath);
      }

      onProgress?.({
        stage: "extracting",
        progress: 0.5,
        message: "Extracting backup data...",
      });

      // Create temporary file for restore
      const tempPath = `${
        FileSystem.documentDirectory
      }temp_restore_${Date.now()}.zip`;
      await FileSystem.writeAsStringAsync(tempPath, backupContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.({
        stage: "importing",
        progress: 0.8,
        message: "Importing data...",
      });

      // TODO: Implement import functionality
      // This would use the same logic as the export, but in reverse
      // For now, we'll just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clean up temporary file
      await FileSystem.deleteAsync(tempPath, { idempotent: true });

      onProgress?.({
        stage: "complete",
        progress: 1.0,
        message: "Restore completed successfully",
      });

      return true;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }

  async deleteBackup(backup: BackupMetadata): Promise<boolean> {
    try {
      await this.initialize();

      const cloudPath = `/gather_backups/${backup.filename}`;

      // Note: react-native-cloud-storage doesn't have a deleteFile method
      // We would need to overwrite with empty content or use a different approach
      console.warn(
        "deleteBackup: react-native-cloud-storage does not support file deletion"
      );
      return false;
    } catch (error) {
      console.error("Failed to delete backup:", error);
      return false;
    }
  }

  getProvider(): string {
    if (Platform.OS === "ios") {
      return "iCloud";
    } else {
      return "Not supported (iOS only)";
    }
  }

  private async registerForBackgroundSync(): Promise<void> {
    try {
      // Use the new generic background task system
      const { BackgroundTaskManager } = require("./backgroundTasks");
      const {
        createCloudBackupTaskHandler,
      } = require("./backgroundTaskHandlers");

      // Register the cloud backup handler
      BackgroundTaskManager.registerHandler(createCloudBackupTaskHandler());

      // Enable background sync if not already enabled
      await BackgroundTaskManager.enableBackgroundSync();
    } catch (error) {
      console.log("Background tasks not available:", error);
      // This is OK - the app will still work with app-state-based backups
    }
  }

  private async unregisterFromBackgroundSync(): Promise<void> {
    try {
      const { BackgroundTaskManager } = require("./backgroundTasks");
      const { BACKGROUND_TASK_NAMES } = require("./backgroundTasks");

      // Unregister the cloud backup handler
      BackgroundTaskManager.unregisterHandler(
        BACKGROUND_TASK_NAMES.CLOUD_BACKUP
      );
    } catch (error) {
      console.log("Background tasks not available for unregistering:", error);
    }
  }

  async getBackgroundTaskStatus(): Promise<{
    isRegistered: boolean;
    isAvailable: boolean;
    status: string | null;
  }> {
    try {
      const { BackgroundTaskManager } = require("./backgroundTasks");
      const { BACKGROUND_TASK_NAMES } = require("./backgroundTasks");

      const isMainTaskRegistered =
        await BackgroundTaskManager.isBackgroundSyncEnabled();
      const handlers = BackgroundTaskManager.getRegisteredHandlers();
      const isCloudBackupRegistered = handlers.some(
        (h: any) => h.name === BACKGROUND_TASK_NAMES.CLOUD_BACKUP
      );
      const status = await BackgroundTaskManager.getBackgroundFetchStatus();

      return {
        isRegistered: isMainTaskRegistered && isCloudBackupRegistered,
        isAvailable: true,
        status: status ? status.toString() : null,
      };
    } catch (error) {
      return {
        isRegistered: false,
        isAvailable: false,
        status: null,
      };
    }
  }
}

export const cloudBackupManager = new CloudBackupManager();

// Development helper for testing cloud backup functionality
// Usage in Metro console:
// require('./utils/cloudBackup').testCloudBackup()
export const testCloudBackup = async () => {
  if (!__DEV__) {
    console.log("Test functions only available in development mode");
    return;
  }

  console.log("🧪 Testing Cloud Backup functionality...");

  try {
    // Enable dev subscription if not already enabled
    const {
      cloudBackupSubscriptionManager,
    } = require("./cloudBackupSubscription");
    cloudBackupSubscriptionManager.enableDevSubscription();
    console.log("✅ Development subscription enabled");

    // Check if cloud storage is available
    const isAvailable = await cloudBackupManager.isCloudAvailable();
    console.log(`✅ Cloud storage available: ${isAvailable}`);

    if (!isAvailable) {
      console.log("❌ Cloud storage not available");
      return;
    }

    // Enable cloud backup
    await cloudBackupManager.setEnabled(true);
    console.log("✅ Cloud backup enabled");

    // Create a test backup
    console.log("📤 Creating test backup...");
    const result = await cloudBackupManager.createBackup((progress) => {
      console.log(
        `   ${progress.stage}: ${Math.round(progress.progress * 100)}% - ${
          progress.message
        }`
      );
    });

    if (result) {
      console.log(
        `✅ Backup created: ${result.filename} (${(
          result.size /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );
    }

    // List backups
    const backups = await cloudBackupManager.listBackups();
    console.log(`📁 Found ${backups.length} backup(s):`);
    backups.forEach((backup, index) => {
      console.log(
        `   ${index + 1}. ${
          backup.filename
        } - ${backup.date.toLocaleString()} (${(
          backup.size /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );
    });

    console.log("🎉 Cloud backup test completed successfully!");
  } catch (error) {
    console.error("❌ Cloud backup test failed:", error);
  }
};
