import { SafeAreaView } from "react-native";
import { ReviewView } from "../../../views/ReviewView";

export default function ReviewScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <ReviewView />
    </SafeAreaView>
  );
}
