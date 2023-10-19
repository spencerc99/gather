import { StyleSheet } from "react-native";
import { FeedView } from "../../../components/FeedView";
import { H2, ScrollView } from "tamagui";

export default function FeedPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 32 }}
    >
      <H2>All Blocks</H2>
      <FeedView />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
