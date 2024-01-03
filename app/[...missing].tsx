import { Stack, usePathname, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { StyledText, StyledView } from "../components/Themed";
import useShareIntent, { isShareIntentUrl } from "../hooks/useShareIntent";
import { useContext, useEffect } from "react";
import { DatabaseContext } from "../utils/db";

export default function NotFoundScreen() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <>
        <Stack.Screen options={{ title: "Oops!" }} />
        <StyledView style={styles.container}>
          <StyledText style={styles.title}>
            This screen doesn't exist.
          </StyledText>
          <StyledText>tried to navigate to: {pathname}</StyledText>

          <StyledText
            style={styles.linkText}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace({ pathname: "/home" });
              }
            }}
          >
            Go back.
          </StyledText>
        </StyledView>
      </>
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
