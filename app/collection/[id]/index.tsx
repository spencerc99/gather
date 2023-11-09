import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CollectionDetailView } from "../../../components/CollectionDetailView";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../utils/db";
import { Spinner, useTheme } from "tamagui";
import { Collection } from "../../../utils/dataTypes";
import { StyledButton, Icon } from "../../../components/Themed";
import { HeaderIcon } from "../../(tabs)/_layout";

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
