import { Tabs, Stack } from "expo-router";
import { YStack } from "tamagui";
import { MainHeaderIcons } from "../app/(tabs)/_layout";
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
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setSelectedCollection(initialCollectionId);
  }, [initialCollectionId]);

  return (
    <>
      <Tabs.Screen
        options={{
          // TODO: this is too jank, bring back when actually working
          // TODO: maybe instead make this like gallery icon and then you can
          // headerLeft: () => (
          //   <XStack
          //     space="$4"
          //     paddingLeft="$3"
          //     alignItems="center"
          //     height="100%"
          //     marginBottom="$2"
          //   >
          //     <Pressable
          //       onPress={() => {
          //         setIsSearching(!isSearching);
          //       }}
          //     >
          //       {({ pressed }) => (
          //         <FontAwesome
          //           name="search"
          //           size={22}
          //           color={
          //             isSearching
          //               ? Colors[colorScheme ?? "light"].tint
          //               : theme.color?.get()
          //           }
          //           style={{ opacity: pressed ? 0.5 : 1 }}
          //           active={isSearching}
          //         />
          //       )}
          //     </Pressable>
          //   </XStack>
          // ),
          headerRight: () => <MainHeaderIcons />,
          headerTitleContainerStyle: {
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
        {selectedCollection !== null && (
          <Stack.Screen
            options={{
              headerRight: (props) => {
                return <CollectionDetailsHeaderLink id={selectedCollection} />;
              },
            }}
          />
        )}
        <TextForageView
          collectionId={selectedCollection || undefined}
          isSearching={isSearching}
        />
      </YStack>
    </>
  );
}
