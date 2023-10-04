import { useFocusEffect, useRouter } from "expo-router";

export default function App() {
  const router = useRouter();

  useFocusEffect(() => {
    // Call the replace method to redirect to a new route without adding to the history.
    // We do this in a useFocusEffect to ensure the redirect happens every time the screen
    // is focused.
    router.replace("/home");
  });

  return null;
}
