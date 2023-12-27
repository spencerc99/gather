import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import {
  StyledView,
  StyledParagraph,
  StyledButton,
  Icon,
  StyledText,
} from "./Themed";
import { Pressable } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { useContext, useEffect, useState } from "react";
import { ConnectionSummary } from "./ConnectionSummary";
import { Connection } from "../utils/dataTypes";
import { ScrollView, YStack } from "tamagui";
import { Link, useRouter } from "expo-router";
import { ExternalLink } from "./ExternalLink";

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
    remoteSourceInfo,
    remoteSourceType,
  } = block;

  const [connections, setConnections] = useState<Connection[]>([]);

  const router = useRouter();
  const { getConnectionsForBlock } = useContext(DatabaseContext);
  useEffect(() => {
    getConnectionsForBlock(id.toString()).then((connections) => {
      setConnections(connections);
    });
  }, [id]);

  return (
    <ScrollView paddingBottom="$2">
      <YStack space="$2">
        {/* block details */}
        <StyledParagraph title>{title}</StyledParagraph>
        {/* {renderContent()} */}
        <BlockSummary
          block={block}
          style={{ width: "100%", height: "auto", aspectRatio: "1/1" }}
        />
        {__DEV__ && <StyledParagraph metadata>ID: {id}</StyledParagraph>}
        {/* TODO: don't show hold item actions and render them inline instead */}
        {/* TODO: change all these to labels and make them editable with a save */}
        {description && (
          <StyledParagraph metadata>{description}</StyledParagraph>
        )}
        <StyledView>
          {/* <StyledParagraph metadata>By: {createdBy}</StyledParagraph> */}
          {source && (
            <StyledText metadata>
              From:{" "}
              <ExternalLink href={source}>
                <StyledParagraph link>{source}</StyledParagraph>
              </ExternalLink>
            </StyledText>
          )}
          <StyledParagraph metadata>
            Created: {createdAt.toLocaleDateString()}
          </StyledParagraph>
          <StyledParagraph metadata>
            Updated: {updatedAt.toLocaleDateString()}
          </StyledParagraph>
          {/* TODO: update to handle multiple sources */}
          {remoteSourceType && (
            <StyledParagraph metadata>
              Syncing to{" "}
              <ExternalLink
                href={`https://are.na/block/${remoteSourceInfo?.arenaId}`}
              >
                <StyledParagraph link>{remoteSourceType}</StyledParagraph>
              </ExternalLink>
            </StyledParagraph>
          )}
        </StyledView>
        <StyledButton
          icon={<Icon name="link" />}
          onPress={() => {
            router.push({
              pathname: "/block/[id]/connect",
              params: { id },
            });
          }}
        >
          Connect
        </StyledButton>
        {/* TODO: separate by your connections vs. friends vs world? */}
        {connections.map((connection) => (
          // TODO: jump to the location of the block??
          <Link
            href={{
              pathname: "/(tabs)/home",
              params: {
                collectionId: connection.collectionId,
              },
            }}
            asChild
          >
            <Pressable>
              <ConnectionSummary
                key={connection.collectionId}
                connection={connection}
              />
            </Pressable>
          </Link>
        ))}
      </YStack>
    </ScrollView>
  );
}
