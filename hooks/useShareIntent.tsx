// Copied from https://github.com/achorein/expo-share-intent-demo/blob/main/hooks/useShareIntent.js
import { useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { ErrorsContext } from "../utils/errors";

import ReceiveSharingIntent from "react-native-receive-sharing-intent";

export type ShareIntent =
  | string
  | { uri: string; mimeType: string; fileName: string };

export function isShareIntentUrl(pathname: string) {
  return pathname.includes(`dataurl=${Constants.expoConfig?.scheme}sharekey`);
}

export default function useShareIntent() {
  const appState = useRef(AppState.currentState);
  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);
  const { logError } = useContext(ErrorsContext);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current === "active" &&
        ["inactive", "background"].includes(nextAppState)
      ) {
        setShareIntent(null);
      }

      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    ReceiveSharingIntent?.getReceivedFiles(
      // @ts-ignore
      (data) => {
        const intent = data[0];
        if (intent.weblink || intent.text) {
          const link = intent.weblink || intent.text || "";
          setShareIntent(link);
        } else if (intent.filePath) {
          setShareIntent({
            uri: intent.contentUri || intent.filePath,
            mimeType: intent.mimeType,
            fileName: intent.fileName,
          });
        } else {
          console.warn("useShareIntent[mount] share type not handled", data);
        }
      },
      // @ts-ignore
      (err) => {
        logError(err);
      },
      // @ts-ignore
      Constants.expoConfig.scheme
    );
    return () => {
      ReceiveSharingIntent?.clearReceivedFiles();
    };
  }, []);

  return {
    shareIntent,
    resetShareIntent: () => setShareIntent(null),
  };
}
