// @ts-nocheck
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Platform, Alert } from "react-native";
import Settings from "../app/settings";
import { cloudBackupManager } from "../utils/cloudBackup";
import { cloudBackupSubscriptionManager } from "../utils/cloudBackupSubscription";
import { UserContext } from "../utils/user";
import { DatabaseContext } from "../utils/db";

// Mock dependencies
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useFixExpoRouter3NavigationTitle: () => {},
}));

jest.mock("../utils/cloudBackup", () => ({
  cloudBackupManager: {
    getStatus: jest.fn(),
    setEnabled: jest.fn(),
    initializeCloudStorage: jest.fn(),
    createBackup: jest.fn(),
  },
}));

jest.mock("../utils/cloudBackupSubscription", () => ({
  cloudBackupSubscriptionManager: {
    getSubscriptionInfo: jest.fn(),
    isEligibleForDiscount: jest.fn(),
    purchaseSubscription: jest.fn(),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

jest.mock("tamagui", () => ({
  ScrollView: ({ children, ...props }) =>
    require("react-native").ScrollView({ children, ...props }),
  YStack: ({ children, ...props }) =>
    require("react-native").View({ children, ...props }),
  XStack: ({ children, ...props }) =>
    require("react-native").View({ children, ...props }),
  Label: ({ children, ...props }) =>
    require("react-native").Text({ children, ...props }),
  Switch: ({ children, onCheckedChange, checked, ...props }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity
        onPress={() => onCheckedChange?.(!checked)}
        testID="switch"
        {...props}
      >
        <Text>{checked ? "ON" : "OFF"}</Text>
        {children}
      </TouchableOpacity>
    );
  },
  Separator: () => require("react-native").View({}),
  useDebounceValue: (value) => value,
}));

jest.mock("../components/Themed", () => ({
  StyledText: ({ children, ...props }) =>
    require("react-native").Text({ children, ...props }),
  LinkButton: ({ children, onPress, href, ...props }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress} testID={`link-${href}`} {...props}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
  StyledButton: ({ children, onPress, disabled, ...props }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        testID="styled-button"
        {...props}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
  Icon: () => require("react-native").View({}),
}));

jest.mock("../components/CollectionSelect", () => ({
  CollectionSelect: () => require("react-native").View({}),
}));

jest.mock("./icons", () => () => require("react-native").View({}));

const mockCloudBackupManager = cloudBackupManager as jest.Mocked<
  typeof cloudBackupManager
>;
const mockSubscriptionManager = cloudBackupSubscriptionManager as jest.Mocked<
  typeof cloudBackupSubscriptionManager
>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

const mockUserContext = {
  currentUser: { id: "user-123", email: "test@example.com" },
};

const mockDatabaseContext = {
  // Add minimal required database context props
};

function renderWithProviders(component: React.ReactElement) {
  return render(
    <UserContext.Provider value={mockUserContext as any}>
      <DatabaseContext.Provider value={mockDatabaseContext as any}>
        {component}
      </DatabaseContext.Provider>
    </UserContext.Provider>
  );
}

describe("Settings Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios" as any;

    // Set default mock return values
    mockCloudBackupManager.getStatus.mockReturnValue({
      isEnabled: false,
      isBackingUp: false,
      lastBackupDate: null,
      lastBackupSize: null,
      error: null,
    });

    mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
      isActive: false,
      expiresAt: null,
      daysRemaining: null,
      price: 12,
      discountApplied: false,
    });

    mockSubscriptionManager.isEligibleForDiscount.mockReturnValue(false);
  });

  describe("Cloud Backup Toggle", () => {
    it("should show subscription prompt when toggling on without subscription", async () => {
      const { getByTestId } = renderWithProviders(<Settings />);

      const cloudBackupSwitch = getByTestId("switch");
      fireEvent.press(cloudBackupSwitch);

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Cloud Backup Subscription",
          expect.stringContaining("Enable automatic backup"),
          expect.arrayContaining([
            { text: "Cancel", style: "cancel" },
            expect.objectContaining({ text: "Subscribe for $12" }),
          ])
        );
      });
    });

    it("should show discount price for eligible users", async () => {
      mockSubscriptionManager.isEligibleForDiscount.mockReturnValue(true);
      const { getByTestId } = renderWithProviders(<Settings />);

      const cloudBackupSwitch = getByTestId("switch");
      fireEvent.press(cloudBackupSwitch);

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Cloud Backup Subscription",
          expect.stringContaining("$11/year"),
          expect.arrayContaining([
            expect.objectContaining({ text: "Subscribe for $11" }),
          ])
        );
      });
    });

    it("should initialize cloud storage when toggling on with active subscription", async () => {
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        daysRemaining: 1,
        price: 12,
        discountApplied: false,
      });
      mockCloudBackupManager.initializeCloudStorage.mockResolvedValue(true);

      const { getByTestId } = renderWithProviders(<Settings />);

      const cloudBackupSwitch = getByTestId("switch");
      fireEvent.press(cloudBackupSwitch);

      await waitFor(() => {
        expect(
          mockCloudBackupManager.initializeCloudStorage
        ).toHaveBeenCalled();
        expect(mockCloudBackupManager.setEnabled).toHaveBeenCalledWith(true);
      });
    });

    it("should handle cloud storage initialization failure", async () => {
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        daysRemaining: 1,
        price: 12,
        discountApplied: false,
      });
      mockCloudBackupManager.initializeCloudStorage.mockResolvedValue(false);

      const { getByTestId } = renderWithProviders(<Settings />);

      const cloudBackupSwitch = getByTestId("switch");
      fireEvent.press(cloudBackupSwitch);

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Error",
          "Failed to connect to cloud storage. Please try again."
        );
      });
    });
  });

  describe("Manual Backup", () => {
    beforeEach(() => {
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        daysRemaining: 1,
        price: 12,
        discountApplied: false,
      });
    });

    it("should create backup when button is pressed", async () => {
      mockCloudBackupManager.createBackup.mockResolvedValue({
        filename: "test-backup.zip",
        date: new Date(),
        size: 1024,
        deviceName: "iPhone",
        appVersion: "1.0.0",
      });

      const { getByTestId } = renderWithProviders(<Settings />);

      const backupButton = getByTestId("styled-button");
      fireEvent.press(backupButton);

      await waitFor(() => {
        expect(mockCloudBackupManager.createBackup).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Success",
          "Backup completed successfully!"
        );
      });
    });

    it("should handle backup failure", async () => {
      mockCloudBackupManager.createBackup.mockRejectedValue(
        new Error("Backup failed")
      );

      const { getByTestId } = renderWithProviders(<Settings />);

      const backupButton = getByTestId("styled-button");
      fireEvent.press(backupButton);

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Error",
          "Failed to create backup. Please try again."
        );
      });
    });

    it("should show subscription prompt for manual backup without subscription", async () => {
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: false,
        expiresAt: null,
        daysRemaining: null,
        price: 12,
        discountApplied: false,
      });

      const { getByTestId } = renderWithProviders(<Settings />);

      const backupButton = getByTestId("styled-button");
      fireEvent.press(backupButton);

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          "Cloud Backup Subscription",
          expect.stringContaining("Enable automatic backup"),
          expect.any(Array)
        );
      });
    });
  });

  describe("Status Display", () => {
    it("should display correct status for inactive subscription", () => {
      const { getByText } = renderWithProviders(<Settings />);

      expect(getByText("Subscription required")).toBeTruthy();
    });

    it("should display backup in progress status", () => {
      mockCloudBackupManager.getStatus.mockReturnValue({
        isEnabled: true,
        isBackingUp: true,
        lastBackupDate: null,
        lastBackupSize: null,
        error: null,
      });

      const { getByText } = renderWithProviders(<Settings />);

      expect(getByText("Backing up...")).toBeTruthy();
    });

    it("should display last backup information", () => {
      const lastBackupDate = new Date("2023-12-01T10:30:00Z");
      mockCloudBackupManager.getStatus.mockReturnValue({
        isEnabled: true,
        isBackingUp: false,
        lastBackupDate,
        lastBackupSize: 1048576, // 1MB
        error: null,
      });
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        daysRemaining: 1,
        price: 12,
        discountApplied: false,
      });

      const { getByText } = renderWithProviders(<Settings />);

      expect(
        getByText(/Last backup: Dec 1, 2023 at 10:30 AM \(1\.00 MB\)/)
      ).toBeTruthy();
    });

    it("should display subscription days remaining", () => {
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000 * 30), // 30 days
        daysRemaining: 30,
        price: 12,
        discountApplied: false,
      });

      const { getByText } = renderWithProviders(<Settings />);

      expect(getByText("30 days remaining")).toBeTruthy();
    });

    it("should display error status", () => {
      mockCloudBackupManager.getStatus.mockReturnValue({
        isEnabled: true,
        isBackingUp: false,
        lastBackupDate: null,
        lastBackupSize: null,
        error: "Storage quota exceeded",
      });

      const { getByText } = renderWithProviders(<Settings />);

      expect(getByText("Error: Storage quota exceeded")).toBeTruthy();
    });
  });

  describe("Platform-specific behavior", () => {
    it("should show iCloud on iOS", () => {
      Platform.OS = "ios" as any;
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        daysRemaining: 1,
        price: 12,
        discountApplied: false,
      });

      const { getByText } = renderWithProviders(<Settings />);

      expect(getByText("iCloud")).toBeTruthy();
    });

    it("should show Google Drive on Android", () => {
      Platform.OS = "android" as any;
      mockSubscriptionManager.getSubscriptionInfo.mockReturnValue({
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        daysRemaining: 1,
        price: 12,
        discountApplied: false,
      });

      const { getByText } = renderWithProviders(<Settings />);

      expect(getByText("Google Drive")).toBeTruthy();
    });
  });
});
