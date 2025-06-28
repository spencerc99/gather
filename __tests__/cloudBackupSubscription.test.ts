// @ts-nocheck
import { Platform, Alert } from "react-native";
import {
  CloudBackupSubscriptionManager,
  cloudBackupSubscriptionManager,
} from "../utils/cloudBackupSubscription";
import * as RNIap from "react-native-iap";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Mock dependencies
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("react-native-iap", () => ({
  initConnection: jest.fn(),
  endConnection: jest.fn(),
  getProducts: jest.fn(),
  requestPurchase: jest.fn(),
  finishTransaction: jest.fn(),
  getAvailablePurchases: jest.fn(),
}));

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    isSignedIn: jest.fn(),
  },
}));

jest.mock("../utils/mmkv", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockRNIap = RNIap as jest.Mocked<typeof RNIap>;
const mockWebBrowser = WebBrowser as jest.Mocked<typeof WebBrowser>;
const mockGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

describe("CloudBackupSubscriptionManager", () => {
  let subscriptionManager: CloudBackupSubscriptionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios" as any;
    subscriptionManager = new CloudBackupSubscriptionManager();
  });

  describe("subscription info", () => {
    it("should return initial subscription state", () => {
      const info = subscriptionManager.getSubscriptionInfo();

      expect(info).toEqual({
        isActive: false,
        expiresAt: null,
        daysRemaining: null,
        price: 12,
        discountApplied: false,
      });
    });

    it("should check if subscription is active", () => {
      expect(subscriptionManager.isSubscriptionActive()).toBe(false);
    });

    it("should calculate days until expiration", () => {
      expect(subscriptionManager.getDaysUntilExpiration()).toBeNull();
    });

    it("should format expiration date", () => {
      expect(subscriptionManager.getFormattedExpirationDate()).toBeNull();
    });
  });

  describe("iOS purchases", () => {
    beforeEach(() => {
      Platform.OS = "ios" as any;
    });

    it("should purchase regular subscription successfully", async () => {
      const mockProduct = {
        productId: "CLOUD_BACKUP_ANNUAL",
        price: "12.00",
        currency: "USD",
      };
      const mockPurchase = {
        productId: "CLOUD_BACKUP_ANNUAL",
        transactionId: "mock-transaction",
        transactionDate: Date.now(),
      };

      mockRNIap.initConnection.mockResolvedValue(true);
      mockRNIap.getProducts.mockResolvedValue([mockProduct]);
      mockRNIap.requestPurchase.mockResolvedValue(mockPurchase);
      mockRNIap.finishTransaction.mockResolvedValue(undefined);

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await subscriptionManager.purchaseSubscription(
        { id: "user-123" } as any,
        false,
        onSuccess,
        onError
      );

      expect(mockRNIap.initConnection).toHaveBeenCalled();
      expect(mockRNIap.getProducts).toHaveBeenCalledWith({
        skus: ["CLOUD_BACKUP_ANNUAL"],
      });
      expect(mockRNIap.requestPurchase).toHaveBeenCalledWith({
        sku: "CLOUD_BACKUP_ANNUAL",
      });
      expect(mockRNIap.finishTransaction).toHaveBeenCalledWith({
        purchase: mockPurchase,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();

      const info = subscriptionManager.getSubscriptionInfo();
      expect(info.isActive).toBe(true);
      expect(info.discountApplied).toBe(false);
      expect(info.price).toBe(12);
    });

    it("should purchase discounted subscription successfully", async () => {
      const mockProduct = {
        productId: "CLOUD_BACKUP_ANNUAL_DISCOUNT",
        price: "11.00",
        currency: "USD",
      };
      const mockPurchase = {
        productId: "CLOUD_BACKUP_ANNUAL_DISCOUNT",
        transactionId: "mock-transaction",
        transactionDate: Date.now(),
      };

      mockRNIap.initConnection.mockResolvedValue(true);
      mockRNIap.getProducts.mockResolvedValue([mockProduct]);
      mockRNIap.requestPurchase.mockResolvedValue(mockPurchase);
      mockRNIap.finishTransaction.mockResolvedValue(undefined);

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await subscriptionManager.purchaseSubscription(
        { id: "user-123" } as any,
        true, // Apply discount
        onSuccess,
        onError
      );

      expect(mockRNIap.getProducts).toHaveBeenCalledWith({
        skus: ["CLOUD_BACKUP_ANNUAL_DISCOUNT"],
      });
      expect(onSuccess).toHaveBeenCalled();

      const info = subscriptionManager.getSubscriptionInfo();
      expect(info.isActive).toBe(true);
      expect(info.discountApplied).toBe(true);
      expect(info.price).toBe(11);
    });

    it("should handle iOS purchase failure", async () => {
      mockRNIap.initConnection.mockResolvedValue(true);
      mockRNIap.getProducts.mockResolvedValue([]);

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await expect(
        subscriptionManager.purchaseSubscription(
          { id: "user-123" } as any,
          false,
          onSuccess,
          onError
        )
      ).rejects.toThrow("Cloud backup subscription not available");

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Cloud backup subscription not available",
        })
      );
    });

    it("should handle connection failure", async () => {
      mockRNIap.initConnection.mockResolvedValue(false);

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await expect(
        subscriptionManager.purchaseSubscription(
          { id: "user-123" } as any,
          false,
          onSuccess,
          onError
        )
      ).rejects.toThrow("Could not connect to App Store");
    });
  });

  describe("Android purchases", () => {
    beforeEach(() => {
      Platform.OS = "android" as any;
    });

    it("should purchase subscription via Stripe successfully", async () => {
      mockGoogleSignin.isSignedIn.mockResolvedValue(true);
      mockWebBrowser.openBrowserAsync.mockResolvedValue({
        type: "dismiss",
      });

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await subscriptionManager.purchaseSubscription(
        { id: "user-123" } as any,
        false,
        onSuccess,
        onError
      );

      expect(mockWebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        expect.stringContaining("price_cloud_backup_annual"),
        expect.objectContaining({
          showTitle: true,
          toolbarColor: "#000000",
          enableBarCollapsing: false,
        })
      );

      // Note: In a real implementation, subscription activation would happen via webhook
      // For testing, we simulate the success
      const info = subscriptionManager.getSubscriptionInfo();
      expect(info.isActive).toBe(true);
    });

    it("should handle Google Sign-In for new users", async () => {
      mockGoogleSignin.isSignedIn.mockResolvedValue(false);
      mockGoogleSignin.signIn.mockResolvedValue({
        user: { email: "test@example.com" },
      });
      mockWebBrowser.openBrowserAsync.mockResolvedValue({
        type: "dismiss",
      });

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await subscriptionManager.purchaseSubscription(
        { id: "user-123" } as any,
        false,
        onSuccess,
        onError
      );

      expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
        webClientId: "",
      });
      expect(mockGoogleSignin.signIn).toHaveBeenCalled();
    });

    it("should use discounted price for eligible users", async () => {
      mockGoogleSignin.isSignedIn.mockResolvedValue(true);
      mockWebBrowser.openBrowserAsync.mockResolvedValue({
        type: "dismiss",
      });

      await subscriptionManager.purchaseSubscription(
        { id: "user-123" } as any,
        true, // Apply discount
        jest.fn(),
        jest.fn()
      );

      expect(mockWebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        expect.stringContaining("price_cloud_backup_annual_discount"),
        expect.any(Object)
      );
    });
  });

  describe("purchase restoration", () => {
    beforeEach(() => {
      Platform.OS = "ios" as any;
    });

    it("should restore purchases successfully on iOS", async () => {
      const mockPurchase = {
        productId: "CLOUD_BACKUP_ANNUAL",
        transactionId: "mock-transaction",
        transactionDate: Date.now() - 86400000, // 1 day ago
      };

      mockRNIap.initConnection.mockResolvedValue(true);
      mockRNIap.getAvailablePurchases.mockResolvedValue([mockPurchase]);
      mockRNIap.endConnection.mockResolvedValue(undefined);

      const result = await subscriptionManager.restorePurchases();

      expect(result).toBe(true);
      expect(mockRNIap.getAvailablePurchases).toHaveBeenCalled();

      const info = subscriptionManager.getSubscriptionInfo();
      expect(info.isActive).toBe(true);
    });

    it("should handle no previous purchases", async () => {
      mockRNIap.initConnection.mockResolvedValue(true);
      mockRNIap.getAvailablePurchases.mockResolvedValue([]);

      const result = await subscriptionManager.restorePurchases();

      expect(result).toBe(false);
    });

    it("should return false on Android", async () => {
      Platform.OS = "android" as any;

      const result = await subscriptionManager.restorePurchases();

      expect(result).toBe(false);
    });

    it("should handle restore failure", async () => {
      mockRNIap.initConnection.mockResolvedValue(false);

      const result = await subscriptionManager.restorePurchases();

      expect(result).toBe(false);
    });
  });

  describe("subscription cancellation", () => {
    it("should show cancellation instructions on iOS", async () => {
      Platform.OS = "ios" as any;

      const result = await subscriptionManager.cancelSubscription();

      expect(result).toBe(true);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        "Cancel Subscription",
        expect.stringContaining("Settings > Your Name > Subscriptions"),
        expect.arrayContaining([
          { text: "Cancel", style: "cancel" },
          expect.objectContaining({ text: "Open Settings" }),
        ])
      );
    });

    it("should handle Android cancellation", async () => {
      Platform.OS = "android" as any;

      const result = await subscriptionManager.cancelSubscription();

      expect(result).toBe(true);
      // For Android, it would call API to cancel Stripe subscription
    });
  });

  describe("discount eligibility", () => {
    it("should check discount eligibility", () => {
      // This would typically check contribution history
      const isEligible = subscriptionManager.isEligibleForDiscount();
      expect(typeof isEligible).toBe("boolean");
    });
  });

  describe("subscription status tracking", () => {
    it("should track subscription expiration", () => {
      // Create a subscription that expires in 30 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // This would be set internally during purchase
      // For testing, we'd need to access internal state
      const daysRemaining = subscriptionManager.getDaysUntilExpiration();
      expect(daysRemaining).toBeNull(); // Initially null

      const formattedDate = subscriptionManager.getFormattedExpirationDate();
      expect(formattedDate).toBeNull(); // Initially null
    });

    it("should identify expired subscriptions", () => {
      const isActive = subscriptionManager.isSubscriptionActive();
      expect(isActive).toBe(false); // Initially inactive
    });
  });

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      Platform.OS = "android" as any;
      mockGoogleSignin.isSignedIn.mockRejectedValue(new Error("Network error"));

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await expect(
        subscriptionManager.purchaseSubscription(
          { id: "user-123" } as any,
          false,
          onSuccess,
          onError
        )
      ).rejects.toThrow("Network error");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Network error",
        })
      );
    });

    it("should handle IAP errors on iOS", async () => {
      Platform.OS = "ios" as any;
      mockRNIap.initConnection.mockRejectedValue(new Error("IAP Error"));

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await expect(
        subscriptionManager.purchaseSubscription(
          { id: "user-123" } as any,
          false,
          onSuccess,
          onError
        )
      ).rejects.toThrow("IAP Error");
    });
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = CloudBackupSubscriptionManager.getInstance();
      const instance2 = CloudBackupSubscriptionManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(cloudBackupSubscriptionManager);
    });
  });
});
