import { StyleSheet } from "react-native";
import { useContext } from "react";
import { DatabaseContext } from "../../../utils/db";
import { CollectionSummary } from "../../../components/CollectionSummary";
import { CreateCollectionButton } from "../../../components/CreateCollectionButton";
import { ScrollView } from "tamagui";

export default function ProfileScreen() {
  const { collections } = useContext(DatabaseContext);

  return (
    <ScrollView style={styles.container}>
      {/* TODO: show profile information */}
      {<CreateCollectionButton />}
      {collections.map((collection) => (
        <CollectionSummary key={collection.id} collection={collection} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: "10%",
    paddingRight: "10%",
    paddingTop: "10%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
