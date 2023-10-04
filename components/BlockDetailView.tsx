import { Block } from "../utils/db";
import { View, Text } from "./Themed";
import { StyleSheet, Image } from "react-native";
import { MimeType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";
import { BlockSummary } from "./BlockSummary";

export function BlockDetailView({ block }: { block: Block }) {
  const {
    id,
    title,
    description,
    content,
    source,
    createdAt,
    createdBy,
    updatedAt,
  } = block;

  return (
    <View style={styles.block} space="$2">
      {/* block details */}
      <Text style={styles.title}>{title}</Text>
      {/* {renderContent()} */}
      <BlockSummary
        block={block}
        style={{ width: "100%", height: "auto", aspectRatio: "1/1" }}
      />
      {/* TODO: don't show hold item actions and render them inline instead */}
      <Text alignSelf="flex-end">By: {createdBy}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.metadata}>
        <Text>Created: {createdAt.toISOString()}</Text>
        <Text>Updated: {updatedAt.toISOString()}</Text>
      </View>

      {/* Connect button */}
      {/* Connections */}
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
