import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Link, SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { DatabaseProvider } from "../utils/db";
import { HoldMenuProvider } from "react-native-hold-menu";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";
import { config } from "../tamagui.config";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <TamaguiProvider config={config}>
        <Theme name={colorScheme === "dark" ? "dark" : "light"}>
          <HoldMenuProvider
            theme={colorScheme || undefined}
            safeAreaInsets={insets}
          >
            <DatabaseProvider>
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
                  name="internal"
                  options={{
                    presentation: "card",
                    title: "",
                  }}
                />
                <Stack.Screen
                  name="profile"
                  options={{
                    presentation: "card",
                    title: "",
                  }}
                />
                <Stack.Screen
                  name="collection/[id]/index"
                  options={{
                    presentation: "card",
                    title: "",
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
              </Stack>
            </DatabaseProvider>
          </HoldMenuProvider>
        </Theme>
      </TamaguiProvider>
    </ThemeProvider>
  );
}
