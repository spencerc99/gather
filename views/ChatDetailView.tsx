import { Tabs, Stack } from "expo-router";
import { YStack } from "tamagui";
import { MainHeaderIcons } from "../app/(tabs)/_layout";
import { CollectionDetailsHeaderLink } from "../app/collection/[id]";
import { CollectionSelect } from "../components/CollectionSelect";
import { TextForageView } from "../components/TextForageView";
import { useState } from "react";

export function ChatDetailView({
  initialCollectionId,
}: {
  initialCollectionId: string | null;
}) {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    initialCollectionId
  );
  // const router = useRouter();

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () => <MainHeaderIcons />,
          headerTitle: () => (
            <YStack paddingBottom="$3">
              <CollectionSelect
                selectedCollection={selectedCollection}
                // TODO: handle the routing for this to navigate to the correct collection
                // this needs to move the chat.tsx to within the tabs navigation
                // setSelectedCollection={(newCollectionId) => {
                //   router.replace(
                //     !newCollectionId
                //       ? { pathname: "/(tabs)/home" }
                //       : {
                //           pathname: "/collection/[id]/chat",
                //           params: { id: newCollectionId },
                //         }
                //   );
                // }}
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
        {selectedCollection !== null && (
          <Stack.Screen
            options={{
              headerRight: (props) => {
                return <CollectionDetailsHeaderLink id={selectedCollection} />;
              },
            }}
          />
        )}
        <TextForageView collectionId={selectedCollection || undefined} />
      </YStack>
    </>
  );
}
