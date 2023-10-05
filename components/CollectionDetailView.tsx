import { YStack, Spinner, XStack } from "tamagui";
import { Collection } from "../utils/dataTypes";
import { useContext, useEffect, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { BlockSummary } from "./BlockSummary";
import { StyledParagraph } from "./Themed";

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
  } = collection;
  const { getCollectionItems } = useContext(DatabaseContext);
  const [blocks, setBlocks] = useState<Block[] | null>(null);

  useEffect(() => {
    getCollectionItems(id).then((blocks) => setBlocks(blocks));
  }, [id]);

  return (
    <YStack padding="10%">
      <StyledParagraph title>{title}</StyledParagraph>
      <StyledParagraph color="$gray9">{description}</StyledParagraph>
      <StyledParagraph>
        by{" "}
        <StyledParagraph style={{ fontWeight: 700 }}>
          {createdBy}
        </StyledParagraph>
      </StyledParagraph>
      <StyledParagraph>Created at: {createdAt.toISOString()}</StyledParagraph>
      <StyledParagraph>Updated at: {updatedAt.toISOString()}</StyledParagraph>
      <StyledParagraph>Collaborators: {collaborators}</StyledParagraph>
      <StyledParagraph>Total: {numItems}</StyledParagraph>
      {/* insert search bar */}
      {blocks === null ? (
        <Spinner />
      ) : (
        <XStack flexWrap="wrap" space="$2">
          {blocks.map((block) => (
            <BlockSummary block={block} />
          ))}
        </XStack>
      )}
    </YStack>
  );
}
