import { YStack } from "tamagui";
import { TextForageView } from "../../components/TextForageView";
import { CollectionSelect } from "../../components/CollectionSelect";
import { useMemo, useState } from "react";
import { Stack, Tabs } from "expo-router";
import { MainHeaderIcons } from "./_layout";
import { CollectionGearHeaderLink } from "../collection/[id]";

export default function HomeScreen() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () => useMemo(() => <MainHeaderIcons />, []),
          headerTitle: () =>
            useMemo(
              () => (
                <YStack paddingBottom="$3">
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
              [selectedCollection]
            ),
        }}
      />
      <YStack height="100%" overflow="hidden">
        {selectedCollection !== null && (
          <Stack.Screen
            options={{
              headerRight: (props) => {
                return (
                  <CollectionGearHeaderLink
                    id={selectedCollection}
                    tintColor={props.tintColor}
                  />
                );
              },
            }}
          />
        )}
        <TextForageView collectionId={selectedCollection || undefined} />
      </YStack>
    </>
  );
}
