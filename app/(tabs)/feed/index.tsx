import { ScrollView } from "tamagui";
import { FeedView } from "../../../components/FeedView";
import { SafeAreaView } from "react-native";

export default function FeedPage() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* <ScrollView style={{ flex: 1 }}> */}
      <FeedView />
      {/* </ScrollView> */}
    </SafeAreaView>
  );
}
