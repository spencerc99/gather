import { View, Text, YStack, Spinner } from "tamagui";
import { Collection } from "../utils/dataTypes";
import { useContext, useEffect, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { BlockSummary } from "./BlockSummary";

export function CollectionDetailView({
  collection,
}: {
  collection: Collection;
}) {
  const { id, title, description } = collection;
  const { getCollectionItems } = useContext(DatabaseContext);
  const [blocks, setBlocks] = useState<Block[] | null>(null);

  useEffect(() => {
    getCollectionItems(id).then((blocks) => setBlocks(blocks));
  }, [id]);

  return (
    <YStack>
      <Text fontSize="$lg">{title}</Text>
      <Text>{description}</Text>
      {/* load collection items */}
      {blocks === null ? (
        <Spinner />
      ) : (
        blocks.map((block) => <BlockSummary block={block} />)
      )}
    </YStack>
  );
}
