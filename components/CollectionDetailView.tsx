import { YStack, Spinner, XStack, ScrollView } from "tamagui";
import { Collection } from "../utils/dataTypes";
import { useContext, useEffect, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { BlockSummary } from "./BlockSummary";
import { AspectRatioImage, StyledParagraph, StyledView } from "./Themed";
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
  const { getCollectionItems } = useContext(DatabaseContext);
  // const [blocks, setBlocks] = useState<Block[] | null>(null);

  // useEffect(() => {
  //   getCollectionItems(id).then((blocks) => setBlocks(blocks));
  // }, [id]);

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
          <YStack flex={1} space="$1">
            {/* TODO: change all these to labels and make them editable with a save */}
            {description && (
              <StyledParagraph color="$gray9">{description}</StyledParagraph>
            )}
            <StyledView>
              <StyledParagraph metadata>
                {numItems} items by{" "}
                <StyledParagraph metadata style={{ fontWeight: 700 }}>
                  {createdBy}
                </StyledParagraph>
              </StyledParagraph>
              <StyledParagraph metadata>
                Created at: {createdAt.toLocaleDateString()}
              </StyledParagraph>
              <StyledParagraph metadata>
                Updated at: {updatedAt.toLocaleDateString()}
              </StyledParagraph>
              {lastConnectedAt && (
                <StyledParagraph metadata>
                  Last connected at: {lastConnectedAt.toLocaleDateString()}
                </StyledParagraph>
              )}
              <StyledParagraph metadata>
                Collaborators: {collaborators}
              </StyledParagraph>
              {/* TODO: update to handle multiple sources */}
              {remoteSourceType && (
                <StyledParagraph metadata>
                  Syncing to{" "}
                  <ExternalLink
                    href={`https://are.na/channel/${remoteSourceInfo?.arenaId}`}
                  >
                    <StyledParagraph link>{remoteSourceType}</StyledParagraph>
                  </ExternalLink>
                </StyledParagraph>
              )}
            </StyledView>
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
