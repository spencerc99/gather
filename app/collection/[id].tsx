import { useLocalSearchParams } from "expo-router";
import { CollectionDetailView } from "../../components/CollectionDetailView";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../utils/db";
import { Spinner } from "tamagui";
import { Collection } from "../../utils/dataTypes";

export function CollectionDetailScreen() {
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

  return <CollectionDetailView collection={collection} />;
}
