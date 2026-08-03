// ABOUTME: Renders the texting screen and its collection-specific header controls.
// ABOUTME: Keeps the active collection and feed ordering available to the text feed.
import { Tabs, Stack } from "expo-router";
import { XStack, YStack } from "tamagui";
import { CollectionDetailsHeaderLink } from "../app/collection/[id]";
import { TextForageView } from "../components/TextForageView";
import { useEffect, useState } from "react";
import { useTotalBlockCount, useCollection } from "../utils/db";
import { StyledText } from "../components/Themed";
import { Alert, TouchableOpacity } from "react-native";
import { SortType } from "../utils/dataTypes";

export function ChatDetailView({
  initialCollectionId,
}: {
  initialCollectionId: string | null;
}) {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    initialCollectionId
  );
  const [sortType, setSortType] = useState<SortType>(SortType.Added);

  useEffect(() => {
    setSelectedCollection(initialCollectionId);
  }, [initialCollectionId]);

  const { data: totalBlocks = 0 } = useTotalBlockCount();
  const { data: collection } = useCollection(selectedCollection ?? undefined);

  const itemCount = selectedCollection ? collection?.numBlocks : totalBlocks;
  const sortLabel =
    sortType === SortType.Added ? "Added time" : "Recently connected";

  function selectSortType() {
    Alert.alert("Sort texts", undefined, [
      {
        text: "Added time",
        onPress: () => setSortType(SortType.Added),
      },
      {
        text: "Recently connected",
        onPress: () => setSortType(SortType.RecentlyConnected),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

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
            headerRight: () => (
              <XStack alignItems="center">
                <TouchableOpacity onPress={selectSortType}>
                  <StyledText metadata paddingHorizontal="$2">
                    {sortLabel}
                  </StyledText>
                </TouchableOpacity>
                {selectedCollection !== null && (
                  <CollectionDetailsHeaderLink id={selectedCollection} />
                )}
              </XStack>
            ),
          }}
        />
        <TextForageView
          collectionId={selectedCollection || undefined}
          onCollectionChange={setSelectedCollection}
          sortType={sortType}
        />
      </YStack>
    </>
  );
}
