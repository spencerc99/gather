import { useFocusEffect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getBoolean } from "../utils/mmkv";

export default function App() {
  const router = useRouter();
  const [seenIntro, setSeenIntro] = useState<boolean | null>(null);

  useEffect(() => {
    if (seenIntro === null) return;
    router.replace(seenIntro ? "/home" : "/intro");
  }, [seenIntro]);

  useFocusEffect(() => {
    const hasSeenIntro = getBoolean("seenIntro");
    setSeenIntro(Boolean(hasSeenIntro));
  });

  return null;
}
