import { SafeAreaView } from "react-native";
import { InternalDevTools } from "../views/InternalDevTools";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { YStack } from "tamagui";

export default function Dev() {
  useFixExpoRouter3NavigationTitle();

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <YStack paddingHorizontal="10%" paddingTop="10%">
        <InternalDevTools />
      </YStack>
    </SafeAreaView>
  );
}
