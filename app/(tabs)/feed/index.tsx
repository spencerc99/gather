import { StyleSheet } from "react-native";
import { UncategorizedView } from "../../../components/FeedView";
import { ScrollView } from "tamagui";

export default function FeedPage() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 32 }}
    >
      <UncategorizedView />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
