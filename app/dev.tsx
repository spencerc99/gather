import { useState } from "react";
import { SafeAreaView } from "react-native";
import { InternalDevTools } from "../views/InternalDevTools";
import { Stack } from "expo-router";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { YStack } from "tamagui";

export default function Dev() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  useFixExpoRouter3NavigationTitle();

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <YStack paddingHorizontal="10%" paddingTop="10%">
        <InternalDevTools isLoading={isLoading} setIsLoading={setIsLoading} />
      </YStack>
    </SafeAreaView>
  );
}
