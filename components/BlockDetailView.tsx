import { Block } from "../utils/db";
import { StyledView, StyledParagraph } from "./Themed";
import { StyleSheet } from "react-native";
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
      <StyledParagraph title>{title}</StyledParagraph>
      {/* {renderContent()} */}
      <BlockSummary
        block={block}
        style={{ width: "100%", height: "auto", aspectRatio: "1/1" }}
      />
      {/* TODO: don't show hold item actions and render them inline instead */}
      <StyledParagraph alignSelf="flex-end">By: {createdBy}</StyledParagraph>
      <StyledParagraph>{description}</StyledParagraph>
      <StyledView style={styles.metadata}>
        <StyledParagraph metadata>
          Created: {createdAt.toLocaleTimeString()}
        </StyledParagraph>
        <StyledParagraph metadata>
          Updated: {updatedAt.toLocaleTimeString()}
        </StyledParagraph>
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
  metadata: {
    display: "flex",
    alignSelf: "flex-end",
    flexDirection: "column",
  },
});
