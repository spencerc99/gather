import { Block } from "../utils/db";
import { View, Text } from "./Themed";
import { StyleSheet, Image } from "react-native";

export function BlockDetailView({
  id,
  title,
  description,
  content,
  source,
  type,
  createdAt,
  createdBy,
  updatedAt,
}: Block) {
  return (
    <View key={id} style={styles.block}>
      {/* block details */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {type.startsWith("image") ? (
        <Image source={{ uri: content }} style={styles.contentImg} />
      ) : (
        <Text style={styles.contentText}>{content}</Text>
      )}
      <View style={styles.metadata}>
        <Text>Created: {createdAt.toISOString()}</Text>
        <Text>Updated: {updatedAt.toISOString()}</Text>
        <Text>By: {createdBy}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    display: "flex",
    flexDirection: "column",
  },
  description: {},
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contentText: {},
  contentImg: {},
  metadata: {
    display: "flex",
    alignSelf: "flex-end",
    flexDirection: "column",
  },
});
