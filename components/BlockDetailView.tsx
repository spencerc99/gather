import { Link, Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Spinner, XStack, YStack, useWindowDimensions } from "tamagui";
import { Block, Connection } from "../utils/dataTypes";
import { DatabaseContext } from "../utils/db";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { BlockSummary } from "./BlockSummary";
import { ConnectionSummary } from "./ConnectionSummary";
import { ExternalLink } from "./ExternalLink";
import {
  EditableTextOnClick,
  Icon,
  IconType,
  StyledButton,
  StyledParagraph,
  StyledText,
  StyledView,
} from "./Themed";

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
  useFixExpoRouter3NavigationTitle();

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
  const height = useWindowDimensions().height;

  return (
    <>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: "10%",
        }}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        scrollToOverflowEnabled
      >
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
        <YStack gap="$2" marginBottom="$2" flexGrow={1}>
          <EditableTextOnClick
            inputProps={{
              title: true,
              enterKeyHint: "done",
            }}
            text={title}
            defaultText="Add a title..."
            disabled={isLoading}
            onEdit={async (newTitle) => {
              await update(
                async () =>
                  await updateBlock({
                    blockId: id,
                    editInfo: { title: newTitle },
                  })
              );
            }}
          />
          <BlockSummary
            block={block}
            blockStyle={{
              resizeMode: "contain",
              aspectRatio: undefined,
              maxHeight: "100%",
            }}
            style={{}}
            containerProps={{
              paddingBottom: "$2",
              maxHeight: height / 2,
              width: "100%",
            }}
            hideMetadata
          />
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
                async () =>
                  await updateBlock({
                    blockId: id,
                    editInfo: { description: newDescription },
                  })
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
            icon={<Icon name="link" type={IconType.FontAwesome6Icon} />}
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
              key={connection.collectionId}
              href={{
                pathname: "/(tabs)/home",
                params: {
                  collectionId: connection.collectionId,
                },
              }}
              asChild
            >
              <Pressable>
                <ConnectionSummary connection={connection} />
              </Pressable>
            </Link>
          ))}
        </YStack>
      </KeyboardAwareScrollView>
    </>
  );
}
