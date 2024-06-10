import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export function useFixExpoRouter3NavigationTitle() {
  // TODO: issue in expo router 3. remove this when https://github.com/expo/expo/issues/25976 is fixed
  const navigation = useNavigation();
  useEffect(() => {
    if (Platform.OS === "ios") {
      navigation.setOptions({ headerBackTitle: "‎" });
    }
  }, []);
}
