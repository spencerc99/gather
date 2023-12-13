import { useFocusEffect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const router = useRouter();
  const [seenIntro, setSeenIntro] = useState<boolean | null>(null);

  useEffect(() => {
    if (seenIntro === null) return;
    router.replace(seenIntro ? "/home" : "/intro");
  }, [seenIntro]);

  useFocusEffect(() => {
    AsyncStorage.getItem("seenIntro").then((value) => {
      console.log("seenintro", value);
      setSeenIntro(Boolean(value));
    });
  });

  return null;
}
