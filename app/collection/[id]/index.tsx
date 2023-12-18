import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CollectionDetailView } from "../../../components/CollectionDetailView";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../utils/db";
import { Spinner } from "tamagui";
import { Collection } from "../../../utils/dataTypes";
import { HeaderIcon } from "../../(tabs)/_layout";

export function CollectionDetailsHeaderLink({ id }: { id: string }) {
  return (
    <HeaderIcon
      href={{
        pathname: "/collection/[id]",
        params: { id: id.toString() },
      }}
      icon="list-alt"
    />
  );
}

export function CollectionGearHeaderLink({
  id,
  tintColor,
}: {
  id: string;
  tintColor?: string;
}) {
  return (
    <HeaderIcon
      href={{
        pathname: "/collection/[id]/settings",
        params: { id: id.toString() },
      }}
      icon="gear"
    />
  );
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const { getCollection, collections } = useContext(DatabaseContext);

  useEffect(() => {
    getCollection(id.toString()).then((collection) =>
      setCollection(collection)
    );
  }, [id, collections]);

  if (!collection) {
    return <Spinner size="large" color="$orange4" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: (props) => {
            return (
              <CollectionGearHeaderLink
                id={collection.id}
                tintColor={props.tintColor}
              />
            );
          },
        }}
      />
      <CollectionDetailView collection={collection} />
    </>
  );
}
