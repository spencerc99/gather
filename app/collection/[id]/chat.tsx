import { Stack, useLocalSearchParams } from "expo-router";
import { TextForageView } from "../../../components/TextForageView";
import { CollectionGearHeaderLink } from ".";
import { useContext } from "react";
import { DatabaseContext } from "../../../utils/db";

export default function DefaultCollectionChatScreen() {
  const { id } = useLocalSearchParams();

  return <CollectionChatScreen id={id.toString()} />;
}

export function CollectionChatScreen({ id }: { id: string }) {
  const { collections } = useContext(DatabaseContext);

  return (
    <>
      <Stack.Screen
        options={{
          title: collections.find((collection) => collection.id === id)?.title,
          headerRight: (props) => {
            return (
              <CollectionGearHeaderLink
                id={id.toString()}
                tintColor={props.tintColor}
              />
            );
          },
        }}
      />
      <TextForageView collectionId={id.toString()} />
    </>
  );
}
