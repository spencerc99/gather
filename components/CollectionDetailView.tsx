import { YStack, Spinner, XStack, ScrollView } from "tamagui";
import { Collection } from "../utils/dataTypes";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import { BlockSummary } from "./BlockSummary";
import {
  ArenaLogo,
  AspectRatioImage,
  StyledButton,
  StyledParagraph,
  StyledText,
  StyledView,
} from "./Themed";
import { ExternalLink } from "./ExternalLink";
import { Stack } from "expo-router";

export function CollectionDetailView({
  collection,
}: {
  collection: Collection;
}) {
  const {
    id,
    title,
    description,
    createdAt,
    createdBy,
    collaborators,
    updatedAt,
    numBlocks: numItems,
    lastConnectedAt,
    remoteSourceInfo,
    remoteSourceType,
    thumbnail,
  } = collection;
  const { getCollectionItems, syncNewRemoteItems } =
    useContext(DatabaseContext);
  const [isLoading, setIsLoading] = useState(false);
  // const [blocks, setBlocks] = useState<Block[] | null>(null);

  // useEffect(() => {
  //   getCollectionItems(id).then((blocks) => setBlocks(blocks));
  // }, [id]);

  async function onClickSyncNewItems() {
    setIsLoading(true);
    try {
      await syncNewRemoteItems(id);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
        }}
      />
      <ScrollView>
        <YStack padding="10%">
          {/* <XStack space="$3" flex={1}> */}
          <YStack flex={1} gap="$1">
            {/* TODO: change all these to labels and make them editable with a save */}
            <StyledParagraph title marginBottom="$2">
              {title}
            </StyledParagraph>
            {__DEV__ && <StyledParagraph metadata>ID: {id}</StyledParagraph>}
            {description && (
              <StyledParagraph color="$gray9">{description}</StyledParagraph>
            )}
            <StyledParagraph metadata>
              {numItems} items
              {/* by{" "} */}
              {/* <StyledParagraph metadata style={{ fontWeight: 700 }}>
                {createdBy}
              </StyledParagraph> */}
            </StyledParagraph>
            <StyledParagraph metadata>
              Created at: {createdAt.toLocaleString()}
            </StyledParagraph>
            <StyledParagraph metadata>
              Updated at: {updatedAt.toLocaleString()}
            </StyledParagraph>
            {lastConnectedAt && (
              <StyledParagraph metadata>
                Last connected at: {lastConnectedAt.toLocaleString()}
              </StyledParagraph>
            )}
            {/* <StyledParagraph metadata>
              Collaborators: {collaborators}
            </StyledParagraph> */}
            {/* TODO: update to handle multiple sources */}
            {remoteSourceType && (
              <>
                <StyledParagraph metadata>
                  Syncing to/from{" "}
                  <ExternalLink
                    href={`https://are.na/channel/${remoteSourceInfo?.arenaId}`}
                  >
                    <StyledParagraph link>{remoteSourceType}</StyledParagraph>
                  </ExternalLink>
                </StyledParagraph>
                {/* TODO: add a dev button to reset channel to start */}
                <StyledButton
                  onPress={onClickSyncNewItems}
                  disabled={isLoading}
                  icon={isLoading ? <Spinner size="small" /> : null}
                  marginTop="$2"
                >
                  {`Sync new items from ${remoteSourceType}`}
                  <ArenaLogo style={{ marginLeft: -4 }} />
                </StyledButton>
                {/* TODO: add a button to "reset" channel from remote, which deletes items that it doesn't find */}
                {/* <StyledButton
                  onPress={onClickSyncNewItems}
                  disabled={isLoading}
                  icon={isLoading ? <Spinner size="small" /> : null}
                  marginTop="$2"
                >
                  {`Sync new items from ${remoteSourceType}`}
                  <ArenaLogo style={{ marginLeft: -4 }} />
                </StyledButton> */}
              </>
            )}
          </YStack>
          {/* <AspectRatioImage uri={thumbnail} otherProps={{ flex: 1 }} /> */}
          {/* </XStack> */}
          {/* insert search bar */}
          {/* {blocks === null ? (
          <Spinner />
        ) : (
          <XStack flexWrap="wrap" space="$2">
            {blocks.map((block) => (
              <BlockSummary block={block} />
            ))}
          </XStack>
        )} */}
        </YStack>
      </ScrollView>
    </>
  );
}
