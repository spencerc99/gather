import { Tabs, Stack } from "expo-router";
import { YStack } from "tamagui";
import { CollectionDetailsHeaderLink } from "../app/collection/[id]";
import { TextForageView } from "../components/TextForageView";
import { useEffect, useState } from "react";

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
            headerRight: (props) => {
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
