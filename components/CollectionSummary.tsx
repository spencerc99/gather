import { StyleSheet } from "react-native";
import { Collection } from "../utils/dataTypes";
import { Text } from "./common";
import { View } from "tamagui";

export function CollectionSummary({ collection }: { collection: Collection }) {
  const { title, updatedAt, createdBy, numItems } = collection;

  return (
    // TODO: add a pressable to navigate to the collection detail view
    <View style={styles.contentContainer}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metaContainer}>
        <Text>
          {createdBy} | {numItems} items
        </Text>
        <Text style={styles.floatRight}>{updatedAt.toDateString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: "bold",
    fontSize: 18,
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    width: "100%",
  },
  metaContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  floatRight: {
    alignSelf: "flex-end",
  },
});
