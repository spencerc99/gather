import { Tabs, Stack } from "expo-router";
import { YStack } from "tamagui";
import { CollectionDetailsHeaderLink } from "../app/collection/[id]";
import { CollectionSelect } from "../components/CollectionSelect";
import { TextForageView } from "../components/TextForageView";
import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

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
          headerTitle: () => (
            <YStack
              justifyContent="center"
              alignItems="center"
              height="100%"
              width="100%"
              marginBottom="$2"
            >
              <CollectionSelect
                onTriggerSelect={() => {
                  Keyboard.dismiss();
                }}
                selectedCollection={selectedCollection}
                setSelectedCollection={setSelectedCollection}
                collectionPlaceholder="All collections"
                triggerProps={{
                  theme: "orange",
                  backgroundColor: "$orange6",
                }}
              />
            </YStack>
          ),
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
        <TextForageView collectionId={selectedCollection || undefined} />
      </YStack>
    </>
  );
}
