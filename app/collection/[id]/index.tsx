import { Stack, useLocalSearchParams } from "expo-router";
import { Spinner } from "tamagui";
import { HeaderIcon } from "../../(tabs)/_layout";
import { CollectionDetailView } from "../../../components/CollectionDetailView";
import { useCollection } from "../../../utils/db";

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

  const { data: collection, isFetching } = useCollection(id.toString());

  if (!collection || isFetching) {
    return <Spinner size="large" color="$orange4" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
        }}
      />
      <CollectionDetailView collection={collection} />
    </>
  );
}
