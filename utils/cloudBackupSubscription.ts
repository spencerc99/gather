import { Platform, Alert } from "react-native";
import { getItem, setItem } from "./mmkv";
import { UserInfo } from "./user";
import * as RNIap from "react-native-iap";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Mock imports for development - replace with actual imports once dependencies are installed
// import * as RNIap from 'react-native-iap';
// import * as WebBrowser from 'expo-web-browser';

// DEVELOPMENT MODE - Set to true to bypass subscription checks for testing
const __DEV_MODE__ = __DEV__; // Uses React Native's __DEV__ flag
const DEV_SUBSCRIPTION_BYPASS_KEY = "devSubscriptionBypass";

export interface CloudBackupSubscription {
  isActive: boolean;
  expiresAt: Date | null;
  purchaseDate: Date | null;
  productId: string | null;
  discountApplied: boolean;
}

const CLOUD_BACKUP_SUBSCRIPTION_KEY = "cloudBackupSubscription";
const CLOUD_BACKUP_PRODUCT_ID = "CLOUD_BACKUP_ANNUAL";
const CLOUD_BACKUP_PRODUCT_ID_DISCOUNT = "CLOUD_BACKUP_ANNUAL_DISCOUNT";
const CLOUD_BACKUP_PRICE = 36; // $36/year
const CLOUD_BACKUP_PRICE_DISCOUNT = 30; // $30/year (1 month discount)
const CLOUD_BACKUP_STRIPE_PRICE_ID = "price_cloud_backup_annual";
const CLOUD_BACKUP_STRIPE_PRICE_ID_DISCOUNT =
  "price_cloud_backup_annual_discount";

// Stripe payment link for Android (regular price)
const STRIPE_CLOUD_BACKUP_LINK = "https://buy.stripe.com/cloud-backup-annual"; // Replace with actual link

// Stripe payment link for Android (discounted price)
const STRIPE_CLOUD_BACKUP_DISCOUNT_LINK =
  "https://buy.stripe.com/cloud-backup-annual-discount"; // Replace with actual link

export class CloudBackupSubscriptionManager {
  private static instance: CloudBackupSubscriptionManager;

  static getInstance(): CloudBackupSubscriptionManager {
    if (!CloudBackupSubscriptionManager.instance) {
      CloudBackupSubscriptionManager.instance =
        new CloudBackupSubscriptionManager();
    }
    return CloudBackupSubscriptionManager.instance;
  }

  private subscription: CloudBackupSubscription = {
    isActive: false,
    expiresAt: null,
    purchaseDate: null,
    productId: null,
    discountApplied: false,
  };

  constructor() {
    this.loadSubscription();
  }

  // DEVELOPMENT METHODS - For testing only
  enableDevSubscription(): void {
    if (!__DEV_MODE__) {
      console.warn("Development methods only available in development mode");
      return;
    }
    setItem(DEV_SUBSCRIPTION_BYPASS_KEY, true);
    console.log("Development subscription bypass enabled");
  }

  disableDevSubscription(): void {
    if (!__DEV_MODE__) {
      console.warn("Development methods only available in development mode");
      return;
    }
    setItem(DEV_SUBSCRIPTION_BYPASS_KEY, false);
    console.log("Development subscription bypass disabled");
  }

  private isDevSubscriptionActive(): boolean {
    if (!__DEV_MODE__) return false;
    return getItem(DEV_SUBSCRIPTION_BYPASS_KEY) === true;
  }

  private loadSubscription(): void {
    const stored = getItem(CLOUD_BACKUP_SUBSCRIPTION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.subscription = {
          ...parsed,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
          purchaseDate: parsed.purchaseDate
            ? new Date(parsed.purchaseDate)
            : null,
        };
      } catch (error) {
        console.error("Failed to parse subscription data:", error);
      }
    }
  }

  private saveSubscription(): void {
    setItem(CLOUD_BACKUP_SUBSCRIPTION_KEY, JSON.stringify(this.subscription));
  }

  getSubscription(): CloudBackupSubscription {
    return { ...this.subscription };
  }

  isSubscriptionActive(): boolean {
    // Only support iOS for now
    if (Platform.OS !== "ios") {
      return false;
    }

    // Check development bypass first
    if (__DEV_MODE__ && this.isDevSubscriptionActive()) {
      return true;
    }

    if (!this.subscription.isActive) return false;
    if (!this.subscription.expiresAt) return false;
    return this.subscription.expiresAt.getTime() > Date.now();
  }

  isEligibleForDiscount(): boolean {
    // Check if user has made any contributions
    // This would be called with actual contributions data
    return false; // Placeholder - implement based on useContributions hook
  }

  async purchaseSubscription(
    user?: UserInfo | null,
    applyDiscount: boolean = false,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Only support iOS for now
      if (Platform.OS !== "ios") {
        const error = new Error(
          "Cloud backup is currently only available on iOS. Android support coming soon!"
        );
        onError?.(error);
        throw error;
      }

      if (Platform.OS === "ios") {
        await this.purchaseIOS(user, applyDiscount, onSuccess, onError);
      } else {
        await this.purchaseAndroid(user, applyDiscount, onSuccess, onError);
      }
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error("Purchase failed");
      onError?.(errorObj);
      throw errorObj;
    }
  }

  private async purchaseIOS(
    user?: UserInfo | null,
    applyDiscount: boolean = false,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Initialize IAP
      const isConnected = await RNIap.initConnection();
      if (!isConnected) {
        throw new Error("Could not connect to App Store");
      }

      // Get products
      const productId = applyDiscount
        ? CLOUD_BACKUP_PRODUCT_ID_DISCOUNT
        : CLOUD_BACKUP_PRODUCT_ID;
      const products = await RNIap.getProducts({ skus: [productId] });

      if (products.length === 0) {
        throw new Error("Cloud backup subscription not available");
      }

      // Make purchase
      const purchase = await RNIap.requestPurchase({
        sku: productId,
      });

      // Verify purchase and activate subscription
      if (purchase) {
        this.subscription = {
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          purchaseDate: new Date(),
          productId: productId,
          discountApplied: applyDiscount,
        };

        this.saveSubscription();

        // Finish transaction
        const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
        await RNIap.finishTransaction({ purchase: purchaseItem });

        onSuccess?.();
      }
    } catch (error) {
      console.error("iOS purchase failed:", error);
      throw error instanceof Error ? error : new Error("iOS purchase failed");
    } finally {
      await RNIap.endConnection();
    }
  }

  private async purchaseAndroid(
    user?: UserInfo | null,
    applyDiscount: boolean = false,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Configure Google Sign-In if not already done
      if (!(await GoogleSignin.isSignedIn())) {
        await GoogleSignin.configure({
          webClientId: "", // You'll need to provide this
        });
        await GoogleSignin.signIn();
      }

      // For Android, we'll use Stripe Checkout via web browser
      const priceId = applyDiscount
        ? CLOUD_BACKUP_STRIPE_PRICE_ID_DISCOUNT
        : CLOUD_BACKUP_STRIPE_PRICE_ID;

      // Create checkout session (you'd implement this endpoint)
      const checkoutUrl = `https://your-api.com/create-checkout-session?price_id=${priceId}&user_id=${user?.id}`;

      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        showTitle: true,
        toolbarColor: "#000000",
        enableBarCollapsing: false,
      });

      if (result.type === "dismiss") {
        // User cancelled checkout
        return;
      }

      // In a real implementation, you'd:
      // 1. Handle the webhook from Stripe to confirm payment
      // 2. Update the subscription status via your API
      // For now, we'll simulate success
      this.subscription = {
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        purchaseDate: new Date(),
        productId: priceId,
        discountApplied: applyDiscount,
      };

      this.saveSubscription();
      onSuccess?.();
    } catch (error) {
      console.error("Android purchase failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Android purchase failed");
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (Platform.OS !== "ios") {
      return false; // Restore is only available on iOS
    }

    try {
      const isConnected = await RNIap.initConnection();
      if (!isConnected) return false;

      const availablePurchases = await RNIap.getAvailablePurchases();
      const cloudBackupPurchase = availablePurchases.find(
        (purchase) =>
          purchase.productId === CLOUD_BACKUP_PRODUCT_ID ||
          purchase.productId === CLOUD_BACKUP_PRODUCT_ID_DISCOUNT
      );

      if (cloudBackupPurchase) {
        this.subscription = {
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Would get from receipt
          purchaseDate: new Date(cloudBackupPurchase.transactionDate),
          productId: cloudBackupPurchase.productId,
          discountApplied:
            cloudBackupPurchase.productId === CLOUD_BACKUP_PRODUCT_ID_DISCOUNT,
        };

        this.saveSubscription();
        return true;
      }

      await RNIap.endConnection();
      return false;
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      return false;
    }
  }

  getSubscriptionInfo(): {
    isActive: boolean;
    expiresAt: Date | null;
    daysRemaining: number | null;
    price: number;
    discountApplied: boolean;
  } {
    const isActive = this.isSubscriptionActive();

    // If using development bypass, show special values
    if (__DEV_MODE__ && this.isDevSubscriptionActive()) {
      return {
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        daysRemaining: 365,
        price: 0,
        discountApplied: false,
      };
    }

    let daysRemaining = null;
    if (this.subscription.expiresAt) {
      const diffTime =
        this.subscription.expiresAt.getTime() - new Date().getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const price = this.subscription.discountApplied
      ? CLOUD_BACKUP_PRICE_DISCOUNT
      : CLOUD_BACKUP_PRICE;

    return {
      isActive,
      expiresAt: this.subscription.expiresAt,
      daysRemaining,
      price,
      discountApplied: this.subscription.discountApplied,
    };
  }

  async cancelSubscription(): Promise<boolean> {
    try {
      if (Platform.OS === "ios") {
        // Direct users to App Store subscription management
        Alert.alert(
          "Cancel Subscription",
          "To cancel your subscription, please go to Settings > Your Name > Subscriptions in the App Store.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                // This would open iOS settings
                console.log("Would open iOS settings");
              },
            },
          ]
        );
      } else {
        // For Stripe, you'd call your API to cancel the subscription
        console.log("Would cancel Stripe subscription via API");
      }

      return true;
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      return false;
    }
  }

  getDaysUntilExpiration(): number | null {
    if (!this.subscription.expiresAt) return null;
    const now = new Date();
    const diffTime = this.subscription.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getFormattedExpirationDate(): string | null {
    if (!this.subscription.expiresAt) return null;
    return this.subscription.expiresAt.toLocaleDateString();
  }
}

export const cloudBackupSubscriptionManager =
  CloudBackupSubscriptionManager.getInstance();
