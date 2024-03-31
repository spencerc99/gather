import { useFocusEffect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getBoolean } from "../utils/asyncStorage";
import {
  hasMigratedFromAsyncStorage,
  migrateFromAsyncStorage,
  storage,
} from "../utils/mmkv";
import { InteractionManager } from "react-native";

export default function App() {
  const router = useRouter();
  const [seenIntro, setSeenIntro] = useState<boolean | null>(null);

  // TODO: REMOVE MIGRATION AFTER
  function handleMigrateFromAsyncStorage() {
    if (!hasMigratedFromAsyncStorage) {
      InteractionManager.runAfterInteractions(async () => {
        try {
          await migrateFromAsyncStorage();
          if (storage.getBoolean("seenIntro")) {
            router.replace("/home");
          }
        } catch (e) {
          // TODO: fall back to AsyncStorage? Wipe storage clean and use MMKV? Crash app?
        }
      });
    }
  }
  // TODO: REMOVE MIGRATION AFTER

  useEffect(() => {
    if (seenIntro === null) return;
    router.replace(seenIntro ? "/home" : "/intro");
  }, [seenIntro]);

  useFocusEffect(() => {
    handleMigrateFromAsyncStorage();
    const hasSeenIntro = getBoolean("seenIntro");
    setSeenIntro(Boolean(hasSeenIntro));
  });

  return null;
}
