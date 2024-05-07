import { useLocalSearchParams } from "expo-router";
import { BlockDetailView } from "../../../components/BlockDetailView";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext, useBlock } from "../../../utils/db";
import { Block } from "../../../utils/dataTypes";
import { ScrollView, Spinner, YStack } from "tamagui";

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: block, isFetching } = useBlock(id.toString());

  if (!block || isFetching) {
    return <Spinner size="large" color="$orange9" />;
  }

  return <BlockDetailView block={block} />;
}
