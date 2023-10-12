import { useContext } from "react";
import { DatabaseContext } from "../utils/db";
import { StyledView } from "../components/Themed";
import { XStack, YStack } from "tamagui";
import { CollectionSummary } from "../components/CollectionSummary";
import { Link } from "expo-router";
import { Pressable } from "react-native";

export function CollectionChatsView() {
  const { collections } = useContext(DatabaseContext);

  return (
    <YStack>
      {/* TODO: add an add collection that enters and search bar? */}
      {/* Sort by last message, add some thing about last message */}
      {collections.map((collection) => (
        <Link
          href={{
            pathname: "/collection/[id]/chat",
            params: { id: collection.id },
          }}
          key={collection.id}
          asChild
        >
          <Pressable>
            <CollectionSummary collection={collection} />
          </Pressable>
        </Link>
      ))}
    </YStack>
  );
}
