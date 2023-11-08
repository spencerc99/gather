import { Theme, XStack, YStack } from "tamagui";
import { TextForageView } from "../../components/TextForageView";
import { CollectionSelect } from "../../components/CollectionSelect";
import { useState } from "react";
import { CollectionChatScreen } from "../collection/[id]/chat";
import { Tabs } from "expo-router";
import { MainHeaderIcons } from "./_layout";

export default function HomeScreen() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () => <MainHeaderIcons />,
          headerTitle: () => (
            <YStack paddingBottom="$2">
              <CollectionSelect
                selectedCollection={selectedCollection}
                setSelectedCollection={setSelectedCollection}
                collectionPlaceholder="All collections"
                triggerProps={{
                  theme: "orange",
                  backgroundColor: "$orange4",
                }}
              />
            </YStack>
          ),
        }}
      />
      <YStack height="100%" overflow="hidden">
        {selectedCollection === null ? (
          <TextForageView />
        ) : (
          <CollectionChatScreen id={selectedCollection} />
        )}
      </YStack>
    </>
  );
}
