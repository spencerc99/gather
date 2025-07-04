import { H3, H4, Label, ScrollView, Switch, XStack, YStack } from "tamagui";
import { getItem, setItem } from "../utils/mmkv";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { useState, useEffect, useCallback, useContext } from "react";
import { Separator } from "tamagui";
import {
  StyledText,
  LinkButton,
  Icon,
  StyledButton,
} from "../components/Themed";
import { CollectionSelect } from "../components/CollectionSelect";
import Icons from "./icons";
import * as Location from "expo-location";
import { Linking, Alert, Platform } from "react-native";
import { cloudBackupManager } from "../utils/cloudBackup";
import { cloudBackupSubscriptionManager } from "../utils/cloudBackupSubscription";
import { UserContext } from "../utils/user";
import { useRouter } from "expo-router";
import dayjs from "dayjs";

interface AppSettingConfig<T extends AppSettingType> {
  type: T;
  label: string;
  description?: string;
  defaultValue: AppSettingTypeToValueType[T];
  renderPicker: (config: AppSettingConfig<T>) => JSX.Element;
}

const AppSettingPrefix = "appSetting_";
export enum AppSettingType {
  ShowCameraInTextingView = "ShowCameraInTextingView",
  PromptsCollection = "PromptsCollection", // for a collection of text prompts that replace the default ones
  DefaultCollection = "DefaultCollection", // for the default collection to open
  LocationEnabled = "LocationEnabled",
}

interface AppSettingTypeToValueType {
  [AppSettingType.ShowCameraInTextingView]: boolean;
  [AppSettingType.PromptsCollection]: string | null;
  [AppSettingType.DefaultCollection]: string | null;
  [AppSettingType.LocationEnabled]: boolean;
}

export function getAppSetting<T extends AppSettingType>(
  type: T
): AppSettingTypeToValueType[T] | null {
  const key = AppSettingPrefix + type;
  return getItem<AppSettingTypeToValueType[T]>(key);
}
function setAppSetting<T extends AppSettingType>(
  type: T,
  value: AppSettingTypeToValueType[T]
) {
  const key = AppSettingPrefix + type;
  return setItem(key, value);
}

export function useAppSetting<T extends AppSettingType>(
  type: T,
  initialValue: AppSettingTypeToValueType[T]
) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    const data = getAppSetting(type);
    if (data !== null) {
      setValue(data);
    }
  }, [type]);
  const setAndPersistValue = useCallback(
    (newValue: AppSettingTypeToValueType[T]) => {
      setValue(newValue);
      setAppSetting(type, newValue);
    },
    [type]
  );
  return [value, setAndPersistValue] as const;
}

const AppSettings: Record<AppSettingType, AppSettingConfig<any>> = {
  [AppSettingType.ShowCameraInTextingView]: {
    type: AppSettingType.ShowCameraInTextingView,
    label: "Show camera in texting view",
    defaultValue: false,
    renderPicker: (
      config: AppSettingConfig<AppSettingType.ShowCameraInTextingView>
    ) => {
      const [value, setValue] = useAppSetting(
        AppSettingType.ShowCameraInTextingView,
        config.defaultValue
      );
      return (
        <Switch
          theme="blue"
          checked={value ?? config.defaultValue}
          defaultChecked={config.defaultValue}
          size="$1"
          onCheckedChange={(value) => {
            setValue(value);
          }}
          native
        >
          <Switch.Thumb />
        </Switch>
      );
    },
  },
  [AppSettingType.PromptsCollection]: {
    type: AppSettingType.PromptsCollection,
    label: "Prompts Collection",
    description:
      "Choose a collection to fill the text prompts that you see in the placeholder when gathering.",
    defaultValue: null,
    renderPicker: (config) => {
      const [value, setValue] = useAppSetting(
        AppSettingType.PromptsCollection,
        config.defaultValue
      );
      return (
        <CollectionSelect
          selectedCollection={value}
          setSelectedCollection={setValue}
          collectionPlaceholder="None"
          triggerProps={{
            width: "100%",
          }}
        ></CollectionSelect>
      );
    },
  },
  [AppSettingType.DefaultCollection]: {
    type: AppSettingType.DefaultCollection,
    label: "Default Collection",
    description:
      "Specify a collection to open to when you first launch the app.",
    defaultValue: null,
    renderPicker: (config) => {
      const [value, setValue] = useAppSetting(
        AppSettingType.DefaultCollection,
        config.defaultValue
      );
      return (
        <CollectionSelect
          selectedCollection={value}
          setSelectedCollection={setValue}
          collectionPlaceholder="All Collections"
          triggerProps={{
            width: "100%",
          }}
        />
      );
    },
  },
  [AppSettingType.LocationEnabled]: {
    type: AppSettingType.LocationEnabled,
    label: "Record Location",
    description:
      "Save location data with your blocks to remember where they were created. You can change this at any time in your device settings.",
    defaultValue: false,
    renderPicker: () => {
      const [permissionStatus, setPermissionStatus] =
        useState<Location.PermissionStatus>();

      useEffect(() => {
        checkPermission();
      }, []);

      const checkPermission = async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
      };

      const handleToggle = async (newValue: boolean) => {
        if (newValue) {
          const { status: currentStatus } =
            await Location.getForegroundPermissionsAsync();
          if (currentStatus === "denied") {
            await Linking.openSettings();
          } else {
            await Location.requestForegroundPermissionsAsync();
          }
        } else {
          await Linking.openSettings();
        }
        // Re-check permission after action
        checkPermission();
      };

      return (
        <XStack alignItems="center" gap="$3">
          <Switch
            theme="blue"
            checked={permissionStatus === "granted"}
            size="$1"
            onCheckedChange={handleToggle}
            native
          >
            <Switch.Thumb />
          </Switch>
        </XStack>
      );
    },
  },
};

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser } = useContext(UserContext);
  const [backupStatus, setBackupStatus] = useState(
    cloudBackupManager.getStatus()
  );
  const [subscriptionInfo, setSubscriptionInfo] = useState(
    cloudBackupSubscriptionManager.getSubscriptionInfo()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Development mode state
  const [devSubscriptionEnabled, setDevSubscriptionEnabled] = useState(false);

  useFixExpoRouter3NavigationTitle();

  useEffect(() => {
    // Refresh cloud backup status when screen loads
    setBackupStatus(cloudBackupManager.getStatus());
    setSubscriptionInfo(cloudBackupSubscriptionManager.getSubscriptionInfo());

    // Check development subscription status
    if (__DEV__) {
      setDevSubscriptionEnabled(
        cloudBackupSubscriptionManager.isSubscriptionActive() &&
          subscriptionInfo.price === 0
      );
    }
  }, []);

  const handleCloudBackupToggle = async (enabled: boolean) => {
    if (enabled && !subscriptionInfo.isActive) {
      // Show subscription purchase flow
      router.push("/cloudBackupSubscription");
      return;
    }

    if (enabled) {
      // Initialize cloud storage
      setIsLoading(true);
      try {
        const success = await cloudBackupManager.initializeCloudStorage();
        if (success) {
          await cloudBackupManager.setEnabled(true);
          setBackupStatus(cloudBackupManager.getStatus());
        } else {
          Alert.alert(
            "Error",
            "Failed to connect to cloud storage. Please try again."
          );
        }
      } catch (error) {
        Alert.alert(
          "Error",
          "Failed to enable cloud backup. Please check your internet connection."
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await cloudBackupManager.setEnabled(false);
        setBackupStatus(cloudBackupManager.getStatus());
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDevSubscriptionToggle = (enabled: boolean) => {
    if (!__DEV__) return;

    if (enabled) {
      cloudBackupSubscriptionManager.enableDevSubscription();
    } else {
      cloudBackupSubscriptionManager.disableDevSubscription();
    }

    setDevSubscriptionEnabled(enabled);
    // Refresh subscription info to reflect the change
    setSubscriptionInfo(cloudBackupSubscriptionManager.getSubscriptionInfo());
  };

  const showSubscriptionOptions = () => {
    // Navigate to the beautiful subscription screen instead of showing an alert
    router.push("/cloudBackupSubscription");
  };

  const handleManualBackup = async () => {
    if (!subscriptionInfo.isActive) {
      router.push("/cloudBackupSubscription");
      return;
    }

    setIsLoading(true);
    try {
      await cloudBackupManager.createBackup();
      setBackupStatus(cloudBackupManager.getStatus());
      Alert.alert("Success", "Backup completed successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create backup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  const getBackupStatusText = () => {
    if (!subscriptionInfo.isActive) {
      return "Subscription required";
    }
    if (backupStatus.isBackingUp) {
      return "Backing up...";
    }
    if (backupStatus.lastBackupDate) {
      const formatted = dayjs(backupStatus.lastBackupDate).format(
        "MMM D, YYYY at h:mm A"
      );
      const size = backupStatus.lastBackupSize
        ? formatFileSize(backupStatus.lastBackupSize)
        : "";

      // Check if backup is overdue
      const autoStatus = cloudBackupManager.getAutoBackupStatus();
      if (autoStatus.isOverdue) {
        return `Last backup: ${formatted} ${
          size ? `(${size})` : ""
        } • Backup overdue`;
      }

      // Show next backup time
      const nextBackup = autoStatus.nextBackupDue;
      if (nextBackup) {
        const nextFormatted = dayjs(nextBackup).format("MMM D at h:mm A");
        return `Last backup: ${formatted} ${
          size ? `(${size})` : ""
        } • Next: ${nextFormatted}`;
      }

      return `Last backup: ${formatted} ${size ? `(${size})` : ""}`;
    }
    if (backupStatus.isEnabled) {
      return "Ready to backup • Next backup will occur within 24 hours";
    }
    return "Disabled";
  };

  return (
    <ScrollView
      flex={1}
      paddingBottom={insets.bottom}
      paddingTop="5%"
      paddingHorizontal="5%"
    >
      <YStack backgroundColor="$background" borderRadius="$4" overflow="hidden">
        {Object.entries(AppSettings).map(([type, config], index, array) => {
          return (
            <YStack key={type}>
              <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor="$background"
                  gap="$3"
                  width="100%"
                >
                  <Label fontSize="$4" color="$color">
                    {config.label}
                  </Label>
                  {config.renderPicker(config)}
                </XStack>
                {config.description && (
                  <StyledText fontSize="$small" metadata textAlign="left">
                    {config.description}
                  </StyledText>
                )}
              </YStack>
              {index < array.length - 1 && <Separator />}
            </YStack>
          );
        })}
      </YStack>

      {/* Development Section - Only visible in development mode */}
      {__DEV__ && (
        <YStack
          marginTop="$4"
          backgroundColor="$background"
          borderRadius="$4"
          overflow="hidden"
        >
          <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
            <H4 color="$orange10">🧪 Development</H4>
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor="$background"
              gap="$3"
              width="100%"
            >
              <YStack flex={1}>
                <Label fontSize="$4" color="$color">
                  Cloud Backup Testing
                </Label>
                <StyledText fontSize="$small" metadata>
                  Bypass subscription requirement for testing
                </StyledText>
              </YStack>
              <Switch
                theme="orange"
                checked={devSubscriptionEnabled}
                size="$1"
                onCheckedChange={handleDevSubscriptionToggle}
                native
              >
                <Switch.Thumb />
              </Switch>
            </XStack>
            <StyledText fontSize="$small" metadata textAlign="left">
              Enable this to test cloud backup features without requiring a real
              subscription. Only available in development builds.
            </StyledText>
          </YStack>
        </YStack>
      )}

      {/* Data Management Section - Expanded */}
      {Platform.OS === "ios" && (
        <YStack
          marginTop="$4"
          backgroundColor="$background"
          borderRadius="$4"
          overflow="hidden"
        >
          {/* Cloud Backup */}
          <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
            <H4>Data Management</H4>
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor="$background"
              gap="$3"
              width="100%"
            >
              <YStack flex={1}>
                <Label fontSize="$4" color="$color">
                  Cloud Backup
                </Label>
                {subscriptionInfo.isActive && (
                  <StyledText fontSize="$small" metadata>
                    iCloud
                  </StyledText>
                )}
              </YStack>
              <Switch
                theme="blue"
                checked={backupStatus.isEnabled && subscriptionInfo.isActive}
                disabled={isLoading}
                size="$1"
                onCheckedChange={handleCloudBackupToggle}
                native
              >
                <Switch.Thumb />
              </Switch>
            </XStack>

            <StyledText fontSize="$small" metadata textAlign="left">
              {getBackupStatusText()}
            </StyledText>

            {backupStatus.error && (
              <StyledText fontSize="$small" color="$red10" textAlign="left">
                Error: {backupStatus.error}
              </StyledText>
            )}

            {subscriptionInfo.isActive && (
              <XStack gap="$2" marginTop="$2">
                <StyledButton
                  theme="gray"
                  flex={1}
                  onPress={handleManualBackup}
                  disabled={isLoading || backupStatus.isBackingUp}
                >
                  {backupStatus.isBackingUp ? "Backing up..." : "Backup Now"}
                </StyledButton>
                <StyledButton
                  theme="gray"
                  flex={1}
                  onPress={() => router.push("/restoreBackup")}
                  disabled={isLoading}
                >
                  Restore
                </StyledButton>
              </XStack>
            )}
          </YStack>

          <Separator />

          {/* Export Data */}
          <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor="$background"
              gap="$3"
              width="100%"
            >
              <YStack flex={1}>
                <Label fontSize="$4" color="$color">
                  Export Data
                </Label>
                <StyledText fontSize="$small" metadata textAlign="left">
                  Download a copy of all your data
                </StyledText>
              </YStack>
              <YStack>
                <LinkButton
                  href="/export"
                  theme="gray"
                  icon={<Icon name="folder" />}
                >
                  Export
                </LinkButton>
              </YStack>
            </XStack>
          </YStack>

          <Separator />

          {/* Help/Info */}
          <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
            <StyledText fontSize="$small" metadata textAlign="left">
              Cloud Backup automatically saves your data to iCloud every 24
              hours when you use the app. You can also create manual backups
              anytime. Restore your data on any device by signing in with the
              same account.
            </StyledText>
          </YStack>
        </YStack>
      )}

      {/* Android - Export Only */}
      {Platform.OS === "android" && (
        <YStack
          marginTop="$4"
          backgroundColor="$background"
          borderRadius="$4"
          overflow="hidden"
        >
          {/* Export Data */}
          <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
            <H4>Data Management</H4>
            <XStack
              alignItems="center"
              justifyContent="space-between"
              backgroundColor="$background"
              gap="$3"
              width="100%"
            >
              <YStack flex={1}>
                <Label fontSize="$4" color="$color">
                  Export Data
                </Label>
                <StyledText fontSize="$small" metadata textAlign="left">
                  Download a copy of all your data
                </StyledText>
              </YStack>
              <YStack>
                <LinkButton
                  href="/export"
                  theme="gray"
                  icon={<Icon name="folder" />}
                >
                  Export
                </LinkButton>
              </YStack>
            </XStack>

            <StyledText fontSize="$small" metadata textAlign="left">
              Cloud backup is coming soon for Android. For now, you can export
              your data manually.
            </StyledText>
          </YStack>
        </YStack>
      )}

      <YStack marginTop="$4">
        <Icons />
      </YStack>
    </ScrollView>
  );
}
