import { FeedView } from "../../../components/FeedView";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FeedPage() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FeedView />
    </SafeAreaView>
  );
}
