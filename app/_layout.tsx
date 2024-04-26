import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Link, SplashScreen, Stack, usePathname, useRouter } from "expo-router";
import { useContext, useEffect } from "react";
import { Keyboard, useColorScheme, InteractionManager } from "react-native";
import { DatabaseContext, DatabaseProvider } from "../utils/db";
import { HoldMenuProvider } from "react-native-hold-menu";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";
import { config } from "../tamagui.config";
import { UserProvider } from "../utils/user";
import useShareIntent from "../hooks/useShareIntent";
import { enableFreeze } from "react-native-screens";

enableFreeze(true);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)/home",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

InteractionManager.setDeadline(1000);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [loaded, error] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterLight: require("@tamagui/font-inter/otf/Inter-Light.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <TamaguiProvider config={config}>
        <Theme name={colorScheme === "dark" ? "dark" : "light"}>
          <HoldMenuProvider
            theme={colorScheme || undefined}
            safeAreaInsets={insets}
            // @ts-ignore
            onOpen={() => {
              if (Keyboard.isVisible()) {
                Keyboard.dismiss();
              }
            }}
          >
            <UserProvider>
              <DatabaseProvider>
                <RootLayoutNav />
              </DatabaseProvider>
            </UserProvider>
          </HoldMenuProvider>
        </Theme>
      </TamaguiProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { shareIntent, resetShareIntent } = useShareIntent();
  const { setShareIntent } = useContext(DatabaseContext);

  useEffect(() => {
    if (shareIntent !== null) {
      setShareIntent(shareIntent);
      resetShareIntent();
    }
  }, [shareIntent]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="intro"
        options={{
          presentation: "card",
          title: "",
        }}
      />
      <Stack.Screen
        name="collection/[id]/index"
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="collection/[id]/settings"
        options={{
          presentation: "modal",
          title: "Collection Settings",
        }}
      />
      <Stack.Screen
        name="block/[id]/index"
        options={{
          presentation: "card",
          title: "",
        }}
      />
      <Stack.Screen
        name="block/[id]/connect"
        options={{
          presentation: "modal",
        }}
      />
      <StatusBar style="auto" />
    </Stack>
  );
}
