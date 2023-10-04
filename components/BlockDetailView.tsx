import { Block } from "../utils/db";
import { StyledView, StyledText } from "./Themed";
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
    <StyledView style={styles.block} space="$2">
      {/* block details */}
      <StyledText style={styles.title}>{title}</StyledText>
      {/* {renderContent()} */}
      <BlockSummary
        block={block}
        style={{ width: "100%", height: "auto", aspectRatio: "1/1" }}
      />
      {/* TODO: don't show hold item actions and render them inline instead */}
      <StyledText alignSelf="flex-end">By: {createdBy}</StyledText>
      <StyledText style={styles.description}>{description}</StyledText>
      <StyledView style={styles.metadata}>
        <StyledText>Created: {createdAt.toISOString()}</StyledText>
        <StyledText>Updated: {updatedAt.toISOString()}</StyledText>
      </StyledView>

      {/* Connect button */}
      {/* Connections */}
    </StyledView>
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
