import { Stack, usePathname, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { Text, View } from "../components/Themed";
import useShareIntent, { isShareIntentUrl } from "../hooks/useShareIntent";
import { useContext, useEffect } from "react";
import { DatabaseContext } from "../utils/db";

export default function NotFoundScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntent();
  const { setShareIntent } = useContext(DatabaseContext);

  useEffect(() => {
    if (isShareIntentUrl(pathname) && shareIntent) {
      setShareIntent(shareIntent);
      resetShareIntent();
      router.replace({
        pathname: "/(tabs)/home",
      });
    }
  }, [shareIntent]);

  return (
    <>
      {/* TODO: show the splash screen here instead */}
      {isShareIntentUrl(pathname) ? (
        <Text>Loading...</Text>
      ) : (
        <>
          <Stack.Screen options={{ title: "Oops!" }} />
          <View style={styles.container}>
            <Text style={styles.title}>This screen doesn't exist.</Text>

            <Text
              style={styles.linkText}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace({ pathname: "/(tabs)/home" });
                }
              }}
            >
              Go back.
            </Text>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
