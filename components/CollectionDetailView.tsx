import { View, Text, YStack, Spinner, XStack } from "tamagui";
import { Collection } from "../utils/dataTypes";
import { useContext, useEffect, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { BlockSummary } from "./BlockSummary";

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
    numItems,
  } = collection;
  const { getCollectionItems } = useContext(DatabaseContext);
  const [blocks, setBlocks] = useState<Block[] | null>(null);

  useEffect(() => {
    getCollectionItems(id).then((blocks) => setBlocks(blocks));
  }, [id]);

  return (
    <YStack padding="10%">
      <Text fontSize="$lg" fontWeight="bold">
        {title}
      </Text>
      <Text color="$gray9">{description}</Text>
      <Text>
        by <Text fontWeight="bold">{createdBy}</Text>
      </Text>
      <Text>Created at: {createdAt.toISOString()}</Text>
      <Text>Updated at: {updatedAt.toISOString()}</Text>
      <Text>Collaborators: {collaborators}</Text>
      <Text>Total: {numItems}</Text>
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
