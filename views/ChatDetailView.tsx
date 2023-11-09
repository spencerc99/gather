import { useRouter, Tabs, Stack } from "expo-router";
import { YStack } from "tamagui";
import { MainHeaderIcons } from "../app/(tabs)/_layout";
import { CollectionGearHeaderLink } from "../app/collection/[id]";
import { CollectionSelect } from "../components/CollectionSelect";
import { TextForageView } from "../components/TextForageView";

export function ChatDetailView({
  initialCollectionId,
}: {
  initialCollectionId: string | null;
}) {
  const router = useRouter();

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () => <MainHeaderIcons />,
          headerTitle: () => (
            <YStack paddingBottom="$3">
              <CollectionSelect
                selectedCollection={initialCollectionId}
                setSelectedCollection={(newCollectionId) => {
                  router.push(
                    !newCollectionId
                      ? { pathname: "/(tabs)/home" }
                      : {
                          pathname: "/collection/[id]/chat",
                          params: { id: newCollectionId },
                        }
                  );
                }}
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
        {initialCollectionId !== null && (
          <Stack.Screen
            options={{
              headerRight: (props) => {
                return (
                  <CollectionGearHeaderLink
                    id={initialCollectionId}
                    tintColor={props.tintColor}
                  />
                );
              },
            }}
          />
        )}
        <TextForageView collectionId={initialCollectionId || undefined} />
      </YStack>
    </>
  );
}
