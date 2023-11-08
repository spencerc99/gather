import { Theme, XStack, YStack } from "tamagui";
import { TextForageView } from "../../components/TextForageView";
import { CollectionSelect } from "../../components/CollectionSelect";
import { useState } from "react";
import { CollectionChatScreen } from "../collection/[id]/chat";
import { Tabs } from "expo-router";

export default function HomeScreen() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  return (
    <>
      <Tabs.Screen
        options={{
          headerTitle: () => (
            <YStack paddingBottom="$2">
              <Theme name="orange">
                <CollectionSelect
                  selectedCollection={selectedCollection}
                  setSelectedCollection={setSelectedCollection}
                  collectionPlaceholder="All collections"
                />
              </Theme>
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
