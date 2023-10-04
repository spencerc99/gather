import { useLocalSearchParams } from "expo-router";
import { BlockDetailView } from "../../components/BlockDetailView";
import { useContext, useEffect, useState } from "react";
import { Block, DatabaseContext } from "../../utils/db";
import { Spinner, YStack } from "tamagui";

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams();
  const [block, setBlock] = useState<Block | null>(null);
  const { getBlock } = useContext(DatabaseContext);

  useEffect(() => {
    getBlock(id.toString()).then((block) => setBlock(block));
  }, [id]);

  if (!block) {
    return <Spinner size="large" color="$orange4" />;
  }

  return (
    <YStack padding="10%">
      <BlockDetailView block={block} />
    </YStack>
  );
}
