import { Block, DatabaseContext } from "../utils/db";
import { StyledView, StyledParagraph, StyledButton, Icon } from "./Themed";
import { StyleSheet } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { useContext, useEffect, useState } from "react";
import { ConnectionSummary } from "./ConnectionSummary";
import { Connection } from "../utils/dataTypes";
import { ScrollView, YStack } from "tamagui";

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

  const [connections, setConnections] = useState<Connection[]>([]);

  const { getConnectionsForBlock } = useContext(DatabaseContext);
  useEffect(() => {
    getConnectionsForBlock(id.toString()).then((connections) => {
      setConnections(connections);
    });
  }, [id]);

  return (
    <YStack space="$2">
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
      <StyledButton icon={<Icon name="link" />}>Connect</StyledButton>
      {connections.map((connection) => (
        <ConnectionSummary
          key={connection.collectionId}
          connection={connection}
        />
      ))}
    </YStack>
  );
}

const styles = StyleSheet.create({
  metadata: {
    display: "flex",
    alignSelf: "flex-end",
    flexDirection: "column",
  },
});
