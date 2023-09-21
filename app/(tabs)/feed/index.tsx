import { StyleSheet } from "react-native";

import { View } from "../../../components/Themed";
import { FeedView } from "../../../components/FeedView";

export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <FeedView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
