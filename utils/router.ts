import { useNavigation } from "expo-router";
import { useEffect } from "react";

export function useFixExpoRouter3NavigationTitle() {
  // TODO: issue in expo router 3. remove this when https://github.com/expo/expo/issues/25976 is fixed
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ headerBackTitle: "‎" });
  }, []);
}
