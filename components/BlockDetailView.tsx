import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import {
  StyledView,
  StyledParagraph,
  StyledButton,
  Icon,
  StyledText,
  EditableTextOnClick,
} from "./Themed";
import { Pressable } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { useContext, useEffect, useState } from "react";
import { ConnectionSummary } from "./ConnectionSummary";
import { Connection } from "../utils/dataTypes";
import { ScrollView, Spinner, XStack, YStack } from "tamagui";
import { Link, Stack, useRouter } from "expo-router";
import { ExternalLink } from "./ExternalLink";

export function BlockDetailView({
  block,
  setBlock,
}: {
  block: Block;
  setBlock: (newBlock: Block) => void;
}) {
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
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { getConnectionsForBlock, updateBlock } = useContext(DatabaseContext);
  useEffect(() => {
    getConnectionsForBlock(id.toString()).then((connections) => {
      setConnections(connections);
    });
  }, [id]);

  async function update(updateFn: () => ReturnType<typeof updateBlock>) {
    setIsLoading(true);
    try {
      const newBlock = await updateFn();
      if (newBlock) {
        setBlock(newBlock);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView paddingBottom="$2">
      <Stack.Screen
        options={{
          title: "",
          headerTitle: () =>
            isLoading ? (
              <XStack gap="$2" justifyContent="center">
                <Spinner />
                <StyledText>Updating...</StyledText>
              </XStack>
            ) : null,
        }}
      />
      <YStack gap="$2">
        <EditableTextOnClick
          inputProps={{ title: true }}
          text={title}
          defaultText="Add a title..."
          disabled={isLoading}
          onEdit={async (newTitle) => {
            await update(
              async () => await updateBlock(id, { title: newTitle })
            );
          }}
        />
        {/* {renderContent()} */}
        <BlockSummary block={block} style={{ width: "100%", height: "auto" }} />
        {__DEV__ && <StyledParagraph metadata>ID: {id}</StyledParagraph>}
        {/* TODO: don't show hold item actions and render them inline instead */}
        <EditableTextOnClick
          inputProps={{ metadata: true }}
          text={description}
          defaultText="Add a description..."
          multiline
          disabled={isLoading}
          onEdit={async (newDescription) => {
            await update(
              async () => await updateBlock(id, { description: newDescription })
            );
          }}
        />
        <StyledView gap="$1">
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
