import { View } from "tamagui";
import { Collection } from "../utils/dataTypes";
import { useContext } from "react";
import { DatabaseContext } from "../utils/db";

export function CollectionDetailView({
  collection,
}: {
  collection: Collection;
}) {
  const { id, title, description } = collection;
  // const { getCollectionItems } = useContext(DatabaseContext);

  return (
    <View>
      {/* collection details */}
      {/* load collection items */}
    </View>
  );
}
