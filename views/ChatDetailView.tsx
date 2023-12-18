import { Tabs, Stack, useFocusEffect } from "expo-router";
import { YStack, XStack, useTheme } from "tamagui";
import { MainHeaderIcons } from "../app/(tabs)/_layout";
import { CollectionDetailsHeaderLink } from "../app/collection/[id]";
import { CollectionSelect } from "../components/CollectionSelect";
import { TextForageView } from "../components/TextForageView";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Keyboard, Pressable, useColorScheme } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import Colors from "../constants/Styles";

export function ChatDetailView({
  initialCollectionId,
}: {
  initialCollectionId: string | null;
}) {
  const { collections } = useContext(DatabaseContext);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    initialCollectionId
  );
  const [isSearching, setIsSearching] = useState(false);
  const theme = useTheme();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (
      selectedCollection &&
      !collections.some((c) => c.id === selectedCollection)
    ) {
      setSelectedCollection(null);
    }
  }, [collections.length]);

  return (
    <>
      <Tabs.Screen
        options={{
          headerLeft: () => (
            <XStack
              space="$4"
              paddingLeft="$3"
              alignItems="center"
              height="100%"
              marginBottom="$2"
            >
              <Pressable
                onPress={() => {
                  setIsSearching(!isSearching);
                }}
              >
                {({ pressed }) => (
                  <FontAwesome
                    name="search"
                    size={22}
                    color={
                      isSearching
                        ? Colors[colorScheme ?? "light"].tint
                        : theme.color.get()
                    }
                    style={{ opacity: pressed ? 0.5 : 1 }}
                    active={isSearching}
                  />
                )}
              </Pressable>
            </XStack>
          ),
          headerRight: () => <MainHeaderIcons />,
          headerTitle: () => (
            <YStack paddingBottom="$3">
              <CollectionSelect
                onTriggerSelect={() => {
                  Keyboard.dismiss();
                }}
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
        <TextForageView
          collectionId={selectedCollection || undefined}
          isSearching={isSearching}
        />
      </YStack>
    </>
  );
}
