import { StyleSheet } from "react-native";
import { View } from "../../../components/Themed";
import { useContext } from "react";
import { DatabaseContext } from "../../../utils/db";
import { CollectionSummary } from "../../../components/CollectionSummary";
import { CreateCollectionButton } from "../../../components/CreateCollectionButton";

export default function TabOneScreen() {
  const { collections } = useContext(DatabaseContext);

  return (
    <View style={styles.container}>
      {/* TODO: show profile information */}
      {<CreateCollectionButton />}
      {collections.map((collection) => (
        <CollectionSummary key={collection.id} collection={collection} />
      ))}
    </View>
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
