import { Stack, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Spinner } from "tamagui";
import { HeaderIcon } from "../../(tabs)/_layout";
import { CollectionDetailView } from "../../../components/CollectionDetailView";
import { Collection } from "../../../utils/dataTypes";
import { DatabaseContext } from "../../../utils/db";

export function CollectionDetailsHeaderLink({ id }: { id: string }) {
  return (
    <HeaderIcon
      href={{
        pathname: "/collection/[id]",
        params: { id: id.toString() },
      }}
      icon="gear"
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
  const { getCollection } = useContext(DatabaseContext);

  // TODO: useQuery
  useEffect(() => {
    getCollection(id.toString()).then((collection) =>
      setCollection(collection)
    );
  }, [id]);

  if (!collection) {
    return <Spinner size="large" color="$orange4" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          // headerRight: (props) => {
          //   return (
          //     <CollectionGearHeaderLink
          //       id={collection.id}
          //       tintColor={props.tintColor}
          //     />
          //   );
          // },
        }}
      />
      <CollectionDetailView collection={collection} />
    </>
  );
}
