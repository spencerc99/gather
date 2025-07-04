import { useState, useEffect, useContext } from "react";
import { Alert, Platform } from "react-native";
import { ScrollView, YStack, XStack, Spinner } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { StyledButton, StyledText, Icon } from "../components/Themed";
import { cloudBackupManager, BackupMetadata } from "../utils/cloudBackup";
import { cloudBackupSubscriptionManager } from "../utils/cloudBackupSubscription";
import { useRouter } from "expo-router";
import dayjs from "dayjs";

export default function RestoreBackup() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(
    null
  );

  useFixExpoRouter3NavigationTitle();

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    const subscriptionInfo =
      cloudBackupSubscriptionManager.getSubscriptionInfo();
    if (!subscriptionInfo.isActive) {
      Alert.alert(
        "Subscription Required",
        "You need an active cloud backup subscription to restore backups.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    setIsLoading(true);
    try {
      const backupList = await cloudBackupManager.listBackups();
      setBackups(backupList);
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to load backups. Please check your internet connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (backup: BackupMetadata) => {
    Alert.alert(
      "Restore Backup",
      `This will restore data from ${dayjs(backup.date).format(
        "MMM D, YYYY at h:mm A"
      )}. All restored data will be added to your existing data. This process cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => performRestore(backup),
        },
      ]
    );
  };

  const performRestore = async (backup: BackupMetadata) => {
    setIsRestoring(true);
    setSelectedBackup(backup);
    setRestoreProgress(0);

    try {
      await cloudBackupManager.restoreFromBackup(backup, (progress) => {
        setRestoreProgress(progress);
      });

      Alert.alert(
        "Restore Complete",
        "Your backup has been successfully restored. The app may need to refresh to show all restored data.",
        [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Restore Failed",
        "There was an error restoring your backup. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRestoring(false);
      setSelectedBackup(null);
      setRestoreProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  const getRelativeTime = (date: Date) => {
    const now = dayjs();
    const diff = now.diff(dayjs(date), "minutes");
    if (diff < 60) return `${diff} minutes ago`;
    else if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    else return `${Math.floor(diff / 1440)} days ago`;
  };

  if (isRestoring) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="10%"
        gap="$4"
      >
        <Spinner size="large" color="$blue10" />
        <StyledText fontSize="$6" bold textAlign="center">
          Restoring Backup...
        </StyledText>
        <StyledText textAlign="center" metadata>
          Restoring from{" "}
          {selectedBackup
            ? dayjs(selectedBackup.date).format("MMM D, YYYY")
            : ""}
        </StyledText>
        <StyledText textAlign="center" metadata>
          Progress: {Math.round(restoreProgress * 100)}%
        </StyledText>
        <StyledText textAlign="center" metadata fontSize="$small">
          Please keep the app open until restore is complete.
        </StyledText>
      </YStack>
    );
  }

  return (
    <ScrollView
      flex={1}
      paddingBottom={insets.bottom}
      paddingTop="5%"
      paddingHorizontal="5%"
    >
      <YStack gap="$4">
        <YStack gap="$2">
          <StyledText fontSize="$6" bold>
            Available Backups
          </StyledText>
          <StyledText metadata>
            Select a backup to restore. Data will be added to your existing
            content.
          </StyledText>
        </YStack>

        {isLoading ? (
          <YStack alignItems="center" paddingVertical="$8">
            <Spinner size="large" color="$blue10" />
            <StyledText metadata marginTop="$2">
              Loading backups from{" "}
              {Platform.OS === "ios" ? "iCloud" : "Google Drive"}...
            </StyledText>
          </YStack>
        ) : backups.length === 0 ? (
          <YStack
            alignItems="center"
            paddingVertical="$8"
            backgroundColor="$background"
            borderRadius="$4"
            gap="$2"
          >
            <Icon name="folder" size={48} color="$gray8" />
            <StyledText bold>No Backups Found</StyledText>
            <StyledText metadata textAlign="center">
              No backups were found in your{" "}
              {Platform.OS === "ios" ? "iCloud" : "Google Drive"} storage. Make
              sure you have created backups and are signed in to the same
              account.
            </StyledText>
          </YStack>
        ) : (
          <YStack gap="$3">
            {backups.map((backup, index) => (
              <YStack
                key={backup.fileName}
                backgroundColor="$background"
                borderRadius="$4"
                padding="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} gap="$1">
                    <StyledText bold>
                      {dayjs(backup.date).format("MMM D, YYYY")}
                    </StyledText>
                    <StyledText metadata fontSize="$small">
                      {dayjs(backup.date).format("h:mm A")}
                      {backup.size > 0 && ` • ${formatFileSize(backup.size)}`}
                    </StyledText>
                    <StyledText metadata fontSize="$small">
                      {getRelativeTime(backup.date)}
                    </StyledText>
                  </YStack>
                  <StyledButton
                    size="$3"
                    theme="blue"
                    onPress={() => handleRestore(backup)}
                    disabled={isLoading}
                  >
                    Restore
                  </StyledButton>
                </XStack>
              </YStack>
            ))}
          </YStack>
        )}

        <YStack
          backgroundColor="$background"
          borderRadius="$4"
          padding="$4"
          marginTop="$4"
          gap="$2"
        >
          <StyledText bold>Important Notes:</StyledText>
          <StyledText fontSize="$small" metadata>
            • Restored data will be added to your existing content, not replace
            it
          </StyledText>
          <StyledText fontSize="$small" metadata>
            • Keep the app open during the entire restore process
          </StyledText>
          <StyledText fontSize="$small" metadata>
            • Large backups may take several minutes to restore
          </StyledText>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
