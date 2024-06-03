import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";

export const PHOTOS_FOLDER = `blobs`;

export async function intializeFilesystemFolder() {
  const info = await FileSystem.getInfoAsync(
    FileSystem.documentDirectory + PHOTOS_FOLDER
  );

  if (info.exists) {
    return Promise.resolve();
  }

  return await FileSystem.makeDirectoryAsync(
    FileSystem.documentDirectory + PHOTOS_FOLDER,
    {
      intermediates: true,
    }
  );
}

export async function getFsPathForMediaResult(
  localUri: string,
  extension: string,
  assetId?: string | null
): Promise<string> {
  const newUri = `${PHOTOS_FOLDER}/${
    assetId ? encodeFileSystemPath(assetId) : uuidv4()
  }.${extension}`;
  const async = await FileSystem.copyAsync({
    from: localUri,
    to: FileSystem.documentDirectory + newUri,
  });
  return newUri;
}

export async function getFsPathForRemoteImage(
  remoteUri: string,
  fileName?: string
): Promise<string> {
  const newUri = `${PHOTOS_FOLDER}/${uuidv4()}.jpg`;
  const async = await FileSystem.downloadAsync(
    remoteUri,
    FileSystem.documentDirectory + newUri
  );
  return newUri;
}

export function encodeFileSystemPath(path: string) {
  return encodeURIComponent(path);
}

export function decodeFileSystemPath(path: string) {
  return decodeURIComponent(path);
}
