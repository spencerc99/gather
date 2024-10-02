import { useState } from "react";
import { YStack } from "tamagui";
import { StyledButton, Icon, StyledText } from "../components/Themed";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import { zip } from "react-native-zip-archive";
import * as FileSystem from "expo-file-system";
import { getItem, setItem, useStickyValue } from "../utils/mmkv";
import { PHOTOS_FOLDER } from "../utils/blobs";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LatestExportKey = "latestExport";

interface LatestExportInfo {
  path: string;
  datetime: string;
  size: number;
}

export function setLatestExportInfo(info: LatestExportInfo): void {
  setItem(LatestExportKey, info);
}

export function getLatestExportInfo(): LatestExportInfo | null {
  return getItem<LatestExportInfo>(LatestExportKey);
}

export async function exportData() {
  const timestamp = dayjs().format("YYYY-MM-DD_HHmmss");
  const zipFileName = `gather_export_${timestamp}.zip`;
  const zipFilePath = `${FileSystem.cacheDirectory}exports/${zipFileName}`;

  // Ensure the exports directory exists
  await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}exports/`, {
    intermediates: true,
  });

  // Get the database file path
  const dbPath = `${FileSystem.documentDirectory}SQLite/db.db`;

  // Get the media files directory
  const mediaDir = `${FileSystem.documentDirectory}${PHOTOS_FOLDER}`;

  // Create zip file directly from the database and media folder
  await zip([dbPath, mediaDir], zipFilePath);

  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(zipFilePath, {
    size: true,
  });

  if (!fileInfo.exists) {
    throw new Error("Export failed");
  }

  // Save latest export info
  const latestExport = {
    path: zipFilePath,
    datetime: new Date().toISOString(),
    size: fileInfo.size,
  };
  setLatestExportInfo(latestExport);
  //   Delete other older exports not zipFilePath
  const exportsDir = `${FileSystem.cacheDirectory}exports/`;
  const files = await FileSystem.readDirectoryAsync(exportsDir);
  const zipFiles = files.filter((file) => file.endsWith(".zip"));
  for (const file of zipFiles) {
    if (file !== zipFileName) {
      await FileSystem.deleteAsync(`${exportsDir}${file}`, {
        idempotent: true,
      });
    }
  }

  return latestExport;
}

export default function ExportScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [latestExport, setLatestExport] =
    useStickyValue<LatestExportInfo | null>(LatestExportKey, null);
  useFixExpoRouter3NavigationTitle();
  const insets = useSafeAreaInsets();

  const handleCreateExport = async () => {
    setIsExporting(true);
    try {
      const latestExport = await exportData();
      setLatestExport(latestExport);
    } catch (error) {
      console.error("Error creating export:", error);
      alert("Failed to create export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!latestExport) {
      alert("No export available. Please create an export first.");
      return;
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(latestExport.path, {
        mimeType: "application/zip",
        dialogTitle: "Download Gather Data Export",
        UTI: "public.zip-archive",
      });
    } else {
      alert("Sharing is not available on this device");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  return (
    <YStack padding="$4" gap="$4">
      <YStack gap="$2">
        <StyledButton
          icon={<Icon name="attach" />}
          onPress={handleCreateExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Create Export"}
        </StyledButton>
        <StyledText>
          This may take a while depending on how much content you have.
        </StyledText>
        <StyledButton
          icon={<Icon name="download" />}
          onPress={handleDownloadExport}
          disabled={isExporting || !latestExport}
        >
          Download Data
        </StyledButton>
        {latestExport && (
          <StyledText metadata textAlign="center">
            {new Date(latestExport.datetime).toLocaleString()} |{" "}
            {formatFileSize(latestExport.size)}
          </StyledText>
        )}
      </YStack>
    </YStack>
  );
}
