import { StyleSheet } from "react-native";
import { FeedView } from "../../../components/FeedView";
import { H2, YStack } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FeedPage() {
  return (
    <SafeAreaView style={{ paddingTop: 32, flex: 1 }}>
      <FeedView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
