import { SafeAreaView } from "react-native";
import { ReviewView } from "../../../views/ReviewView";
import { afterAnimations } from "../../../utils/afterAnimations";

export default function ReviewScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      {/* TODO: this takes too long to load rn.. eventually figure out how to do progressive loading on the page */}
      {afterAnimations(ReviewView)()}
    </SafeAreaView>
  );
}
