import { useLocalSearchParams } from "expo-router";
import { BlockDetailView } from "../../../components/BlockDetailView";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../utils/db";
import { Block } from "../../../utils/dataTypes";
import { ScrollView, Spinner, YStack } from "tamagui";

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams();
  const [block, setBlock] = useState<Block | null>(null);
  const { getBlock } = useContext(DatabaseContext);

  useEffect(() => {
    fetchBlock();
  }, [id]);

  function fetchBlock() {
    getBlock(id.toString()).then((block) => {
      setBlock(block);
    });
  }

  if (!block) {
    return <Spinner size="large" color="$orange4" />;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: "10%",
      }}
    >
      <BlockDetailView block={block} setBlock={setBlock} />
    </ScrollView>
  );
}
