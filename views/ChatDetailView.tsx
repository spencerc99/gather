import { Tabs, Stack } from "expo-router";
import { YStack } from "tamagui";
import { CollectionDetailsHeaderLink } from "../app/collection/[id]";
import { TextForageView } from "../components/TextForageView";
import { useEffect, useState } from "react";
import { useTotalBlockCount, useCollection } from "../utils/db";
import { StyledText } from "../components/Themed";

export function ChatDetailView({
  initialCollectionId,
}: {
  initialCollectionId: string | null;
}) {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    initialCollectionId
  );

  useEffect(() => {
    setSelectedCollection(initialCollectionId);
  }, [initialCollectionId]);

  const { data: totalBlocks = 0 } = useTotalBlockCount();
  const { data: collection } = useCollection(selectedCollection || "");

  const itemCount = selectedCollection ? collection?.numBlocks : totalBlocks;

  return (
    <>
      <Tabs.Screen
        options={{
          headerTitleContainerStyle: {
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "70%",
          },
          headerTitle: () => null,
        }}
      />
      <YStack height="100%" overflow="hidden">
        <Stack.Screen
          options={{
            headerLeft: () => (
              <YStack paddingHorizontal="$2">
                <StyledText metadata>
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </StyledText>
              </YStack>
            ),
            headerRight: () => {
              return selectedCollection !== null ? (
                <CollectionDetailsHeaderLink id={selectedCollection} />
              ) : null;
            },
          }}
        />
        <TextForageView
          collectionId={selectedCollection || undefined}
          onCollectionChange={setSelectedCollection}
        />
      </YStack>
    </>
  );
}
