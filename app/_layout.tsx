import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  // Import the creation function
  createStackNavigator,
  // Import the types
  StackNavigationOptions,
} from "@react-navigation/stack";

import { withLayoutContext } from "expo-router";
import { NetworkProvider } from "../utils/network";
import * as NavigationBar from "expo-navigation-bar";
import { TransitionPresets } from "@react-navigation/stack";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useContext, useEffect } from "react";
import {
  InteractionManager,
  Keyboard,
  Platform,
  useColorScheme,
} from "react-native";
import { HoldMenuProvider } from "react-native-hold-menu";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { enableFreeze } from "react-native-screens";
import { TamaguiProvider, Theme } from "tamagui";
import useShareIntent from "../hooks/useShareIntent";
import { config } from "../tamagui.config";
import { DatabaseContext, DatabaseProvider } from "../utils/db";
import { UserProvider } from "../utils/user";
import { ErrorsProvider } from "../utils/errors";

const client = new QueryClient();

enableFreeze(true);

const { Navigator } = createStackNavigator();

// This can be used like `<JsStack />`
export const JsStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator
>(Navigator);

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

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(
        colorScheme === "light" ? "white" : "black"
      );
    }
  }, [colorScheme]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <ErrorsProvider>
          <TamaguiProvider config={config}>
            <Theme name={colorScheme === "dark" ? "dark" : "light"}>
              <QueryClientProvider client={client}>
                <NetworkProvider>
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
                        <StatusBar
                          style="auto"
                          // NOTE: idk why but "auto" doesn't properly change color on Android.
                          backgroundColor={
                            colorScheme === "light" ? "white" : "black"
                          }
                        />
                      </DatabaseProvider>
                    </UserProvider>
                  </HoldMenuProvider>
                </NetworkProvider>
              </QueryClientProvider>
            </Theme>
          </TamaguiProvider>
        </ErrorsProvider>
      </SafeAreaProvider>
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
    <JsStack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <JsStack.Screen
        name="modal"
        options={{
          presentation: "modal",
          headerShown: false,
          ...TransitionPresets.ModalPresentationIOS,
          gestureEnabled: true,
          cardStyle: {
            zIndex: 1000,
          },
        }}
      />
      <Stack.Screen
        name="intro"
        options={{
          presentation: "card",
          title: "",
          headerShown: false,
        }}
      />
      <JsStack.Screen
        name="icons"
        options={{
          presentation: "modal",
          headerShown: false,
          ...TransitionPresets.ModalPresentationIOS,
          gestureEnabled: true,
        }}
      />
      <JsStack.Screen
        name="support"
        options={{
          presentation: "card",
          title: "",
        }}
      />
      <Stack.Screen
        name="dev"
        options={{
          presentation: "card",
          title: "",
        }}
      />
      <Stack.Screen
        name="changelog"
        options={{
          presentation: "card",
          title: "What's New",
        }}
      />
      <Stack.Screen
        name="errors"
        options={{
          presentation: "card",
          title: "",
        }}
      />
      <JsStack.Screen
        name="feedback"
        options={{
          presentation: "modal",
          headerShown: false,
          ...TransitionPresets.ModalPresentationIOS,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="about"
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
        name="block/[id]/index"
        options={{
          presentation: "card",
          title: "",
        }}
      />
      <JsStack.Screen
        name="block/[id]/connect"
        options={{
          presentation: "modal",
          // Very laggy on ios using the preset
          ...(Platform.OS === "android"
            ? { ...TransitionPresets.ModalPresentationIOS }
            : {}),
          gestureEnabled: true,
          headerLeft: () => null,
        }}
      />
    </JsStack>
  );
}
