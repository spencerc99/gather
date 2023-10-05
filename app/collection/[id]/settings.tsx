import { ScrollView, Spinner, YStack } from "tamagui";
import { StyledButton, StyledText } from "../../../components/Themed";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useContext, useEffect } from "react";
import { Collection } from "../../../utils/dataTypes";
import { DatabaseContext } from "../../../utils/db";

export default function CollectionSettingsScreen() {
  const { id } = useLocalSearchParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const { getCollection, deleteCollection } = useContext(DatabaseContext);
  const router = useRouter();

  useEffect(() => {
    getCollection(id.toString()).then((collection) =>
      setCollection(collection)
    );
  }, [id]);

  if (!collection) {
    return <Spinner size="large" color="$orange4" />;
  }

  const { title, description } = collection;
  //   TODO: add confirmation dialog https://tamagui.dev/docs/components/alert-dialog/1.0.0
  function onPressDelete() {
    deleteCollection(id.toString());
    alert("Collection deleted!");
    router.replace("..");
  }

  return (
    <ScrollView padding="10%">
      <YStack alignItems="center">
        {/* TODO: make these editable */}
        <StyledText title>{title}</StyledText>
        <StyledText color="$gray9">{description}</StyledText>

        <StyledButton theme="red" onPress={() => onPressDelete()}>
          Delete
        </StyledButton>
      </YStack>
    </ScrollView>
  );
}
