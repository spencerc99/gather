import { ScrollView, Spinner, YStack } from "tamagui";
import { StyledText } from "../../../components/Themed";
import { useLocalSearchParams } from "expo-router";
import { useState, useContext, useEffect } from "react";
import { Collection } from "../../../utils/dataTypes";
import { DatabaseContext } from "../../../utils/db";

export default function CollectionSettingsScreen() {
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

  const { title, description } = collection;

  return (
    <ScrollView>
      <YStack alignItems="center" padding="10%">
        {/* TODO: make these editable */}
        <StyledText title>{title}</StyledText>
        <StyledText color="$gray9">{description}</StyledText>
      </YStack>
    </ScrollView>
  );
}
