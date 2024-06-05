import { SafeAreaView } from "react-native";
import { InternalDevTools } from "../views/InternalDevTools";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ScrollView, YStack } from "tamagui";

export default function Dev() {
  useFixExpoRouter3NavigationTitle();

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <ScrollView>
        <YStack paddingHorizontal="8%" paddingTop="5%">
          <InternalDevTools />
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
