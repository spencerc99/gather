import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";

export const PHOTOS_FOLDER = `${FileSystem.documentDirectory || ""}blobs`;

export async function intializeFilesystemFolder() {
  const info = await FileSystem.getInfoAsync(PHOTOS_FOLDER);

  if (info.exists) {
    return Promise.resolve();
  }

  return await FileSystem.makeDirectoryAsync(PHOTOS_FOLDER, {
    intermediates: true,
  });
}

export async function getFsPathForImageResult(
  localUri: string
): Promise<string> {
  const newUri = `${PHOTOS_FOLDER}/${uuidv4()}.jpg`;
  await FileSystem.copyAsync({ from: localUri, to: newUri });
  return newUri;
}

export async function getFsPathForRemoteImage(
  remoteUri: string,
  fileName?: string
): Promise<string> {
  const localUri = `${PHOTOS_FOLDER}/${uuidv4()}.jpg`;
  const async = await FileSystem.downloadAsync(remoteUri, localUri);
  return localUri;
}
