// @ts-nocheck
import { Platform } from "react-native";
import {
  cloudBackupManager,
  BackupMetadata,
  BackupProgress,
  RestoreProgress,
} from "../utils/cloudBackup";
import * as FileSystem from "expo-file-system";
import { CloudStorage, CloudStorageProvider } from "react-native-cloud-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { exportData } from "../app/export";

// Mock dependencies
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  documentDirectory: "file:///test/",
  EncodingType: {
    Base64: "base64",
  },
}));

jest.mock("react-native-cloud-storage", () => ({
  CloudStorage: {
    getProvider: jest.fn(),
    setProviderOptions: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
  CloudStorageProvider: {
    ICloud: "iCloud",
    GoogleDrive: "googleDrive",
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
    isSignedIn: jest.fn(),
  },
}));

jest.mock("../app/export", () => ({
  exportData: jest.fn(),
}));

jest.mock("../utils/mmkv", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockExportData = exportData as jest.MockedFunction<typeof exportData>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockCloudStorage = CloudStorage as jest.Mocked<typeof CloudStorage>;
const mockGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;

describe("CloudBackupManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset platform to iOS for most tests
    Platform.OS = "ios" as any;
  });

  describe("initialization", () => {
    it("should initialize successfully on iOS", async () => {
      mockCloudStorage.getProvider.mockReturnValue(CloudStorageProvider.ICloud);

      const result = await cloudBackupManager.initializeCloudStorage();

      expect(result).toBe(true);
      expect(mockCloudStorage.getProvider).toHaveBeenCalled();
    });

    it("should initialize successfully on Android with Google Sign-In", async () => {
      Platform.OS = "android" as any;
      mockGoogleSignin.isSignedIn.mockResolvedValue(false);
      mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
      mockGoogleSignin.signIn.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);
      mockGoogleSignin.getTokens.mockResolvedValue({
        accessToken: "mock-token",
      });

      const result = await cloudBackupManager.initializeCloudStorage();

      expect(result).toBe(true);
      expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
        scopes: ["https://www.googleapis.com/auth/drive.file"],
        webClientId: "",
      });
      expect(mockGoogleSignin.signIn).toHaveBeenCalled();
      expect(mockCloudStorage.setProviderOptions).toHaveBeenCalledWith({
        accessToken: "mock-token",
      });
    });

    it("should handle initialization failure", async () => {
      mockCloudStorage.getProvider.mockImplementation(() => {
        throw new Error("Cloud storage not available");
      });

      const result = await cloudBackupManager.initializeCloudStorage();

      expect(result).toBe(false);
      const status = cloudBackupManager.getStatus();
      expect(status.error).toContain("Cloud storage not available");
    });
  });

  describe("backup creation", () => {
    beforeEach(() => {
      mockCloudStorage.getProvider.mockReturnValue(CloudStorageProvider.ICloud);
      mockExportData.mockResolvedValue({
        path: "/test/backup.zip",
        fileCount: 100,
        totalSize: 1024000,
      });
      mockFileSystem.readAsStringAsync.mockResolvedValue("mock-base64-content");
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024000,
      } as any);
      mockCloudStorage.writeFile.mockResolvedValue(undefined);
      mockCloudStorage.readFile.mockResolvedValue("mock-base64-content");
      mockFileSystem.deleteAsync.mockResolvedValue(undefined);
    });

    it("should create backup successfully", async () => {
      const progressCallback = jest.fn();

      const result = await cloudBackupManager.createBackup(progressCallback);

      expect(result).toBeTruthy();
      expect(result?.filename).toMatch(
        /gather_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_iPhone\.zip/
      );
      expect(result?.size).toBe(1024000);
      expect(result?.deviceName).toBe("iPhone");

      // Verify progress callbacks
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "preparing",
        progress: 0.1,
        message: "Preparing backup data...",
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "uploading",
        progress: 0.5,
        message: "Uploading to cloud...",
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "verifying",
        progress: 0.9,
        message: "Verifying backup...",
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "complete",
        progress: 1.0,
        message: "Backup completed successfully",
      });

      // Verify export was called
      expect(mockExportData).toHaveBeenCalled();

      // Verify cloud upload
      expect(mockCloudStorage.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/gather_backups\/gather_backup_.*\.zip/),
        "mock-base64-content"
      );

      // Verify backup verification
      expect(mockCloudStorage.readFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/gather_backups\/gather_backup_.*\.zip/)
      );

      // Verify cleanup
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        "/test/backup.zip",
        {
          idempotent: true,
        }
      );
    });

    it("should handle export failure", async () => {
      mockExportData.mockResolvedValue(null);

      await expect(cloudBackupManager.createBackup()).rejects.toThrow(
        "Failed to create backup data"
      );

      const status = cloudBackupManager.getStatus();
      expect(status.error).toBe("Failed to create backup data");
      expect(status.isBackingUp).toBe(false);
    });

    it("should handle cloud storage quota exceeded", async () => {
      mockCloudStorage.writeFile.mockRejectedValue(
        new Error("storage quota exceeded")
      );

      await expect(cloudBackupManager.createBackup()).rejects.toThrow(
        "Cloud storage is full. Please free up space and try again."
      );

      const status = cloudBackupManager.getStatus();
      expect(status.error).toBe(
        "Cloud storage is full. Please free up space and try again."
      );
    });

    it("should handle backup verification failure", async () => {
      mockCloudStorage.readFile.mockRejectedValue(new Error("File not found"));

      await expect(cloudBackupManager.createBackup()).rejects.toThrow(
        "Backup verification failed"
      );
    });

    it("should update backup status during process", async () => {
      const backupPromise = cloudBackupManager.createBackup();

      // Status should show backing up
      const statusDuring = cloudBackupManager.getStatus();
      expect(statusDuring.isBackingUp).toBe(true);

      await backupPromise;

      // Status should be updated after completion
      const statusAfter = cloudBackupManager.getStatus();
      expect(statusAfter.isBackingUp).toBe(false);
      expect(statusAfter.lastBackupDate).toBeTruthy();
      expect(statusAfter.lastBackupSize).toBe(1024000);
      expect(statusAfter.error).toBeNull();
    });
  });

  describe("backup restoration", () => {
    const mockBackup: BackupMetadata = {
      filename: "gather_backup_2023-12-01_10-30-00_iPhone.zip",
      date: new Date("2023-12-01T10:30:00Z"),
      size: 1024000,
      deviceName: "iPhone",
      appVersion: "1.0.0",
    };

    beforeEach(() => {
      mockCloudStorage.getProvider.mockReturnValue(CloudStorageProvider.ICloud);
      mockCloudStorage.readFile.mockResolvedValue("mock-base64-content");
      mockFileSystem.writeAsStringAsync.mockResolvedValue(undefined);
      mockFileSystem.deleteAsync.mockResolvedValue(undefined);
    });

    it("should restore backup successfully", async () => {
      const progressCallback = jest.fn();

      const result = await cloudBackupManager.restoreFromBackup(
        mockBackup,
        progressCallback
      );

      expect(result).toBe(true);

      // Verify progress callbacks
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "downloading",
        progress: 0.1,
        message: "Downloading backup from cloud...",
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "extracting",
        progress: 0.5,
        message: "Extracting backup data...",
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "importing",
        progress: 0.8,
        message: "Importing data...",
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: "complete",
        progress: 1.0,
        message: "Restore completed successfully",
      });

      // Verify cloud download
      expect(mockCloudStorage.readFile).toHaveBeenCalledWith(
        "/gather_backups/gather_backup_2023-12-01_10-30-00_iPhone.zip"
      );

      // Verify temporary file creation
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringMatching(/temp_restore_\d+\.zip/),
        "mock-base64-content",
        { encoding: "base64" }
      );

      // Verify cleanup
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringMatching(/temp_restore_\d+\.zip/),
        { idempotent: true }
      );
    });

    it("should handle restore failure", async () => {
      mockCloudStorage.readFile.mockRejectedValue(new Error("File not found"));

      await expect(
        cloudBackupManager.restoreFromBackup(mockBackup)
      ).rejects.toThrow("File not found");
    });
  });

  describe("status management", () => {
    it("should get initial status", () => {
      const status = cloudBackupManager.getStatus();

      expect(status).toEqual({
        isEnabled: false,
        isBackingUp: false,
        lastBackupDate: null,
        lastBackupSize: null,
        error: null,
      });
    });

    it("should enable/disable backup", () => {
      cloudBackupManager.setEnabled(true);
      let status = cloudBackupManager.getStatus();
      expect(status.isEnabled).toBe(true);

      cloudBackupManager.setEnabled(false);
      status = cloudBackupManager.getStatus();
      expect(status.isEnabled).toBe(false);
      expect(status.error).toBeNull(); // Error should be cleared when disabling
    });
  });

  describe("platform-specific behavior", () => {
    it("should return correct provider for iOS", () => {
      Platform.OS = "ios" as any;
      expect(cloudBackupManager.getProvider()).toBe("iCloud");
    });

    it("should return correct provider for Android", () => {
      Platform.OS = "android" as any;
      expect(cloudBackupManager.getProvider()).toBe("Google Drive");
    });

    it("should handle Android-specific backup filename", async () => {
      Platform.OS = "android" as any;
      mockGoogleSignin.isSignedIn.mockResolvedValue(true);
      mockExportData.mockResolvedValue({
        path: "/test/backup.zip",
        fileCount: 100,
        totalSize: 1024000,
      });
      mockFileSystem.readAsStringAsync.mockResolvedValue("mock-base64-content");
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024000,
      } as any);
      mockCloudStorage.writeFile.mockResolvedValue(undefined);
      mockCloudStorage.readFile.mockResolvedValue("mock-base64-content");
      mockFileSystem.deleteAsync.mockResolvedValue(undefined);

      const result = await cloudBackupManager.createBackup();

      expect(result?.filename).toMatch(
        /gather_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_Android\.zip/
      );
      expect(result?.deviceName).toBe("Android");
    });
  });

  describe("error handling", () => {
    it("should handle cloud storage not available", async () => {
      mockCloudStorage.getProvider.mockReturnValue(undefined as any);

      await expect(cloudBackupManager.createBackup()).rejects.toThrow(
        "iCloud is not available"
      );
    });

    it("should handle Google Sign-In failure on Android", async () => {
      Platform.OS = "android" as any;
      mockGoogleSignin.isSignedIn.mockResolvedValue(false);
      mockGoogleSignin.signIn.mockRejectedValue(new Error("Sign-in cancelled"));

      const result = await cloudBackupManager.initializeCloudStorage();
      expect(result).toBe(false);
    });
  });
});
