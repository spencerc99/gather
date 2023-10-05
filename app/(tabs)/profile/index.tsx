import { Pressable, StyleSheet } from "react-native";
import { useContext } from "react";
import { DatabaseContext } from "../../../utils/db";
import { CollectionSummary } from "../../../components/CollectionSummary";
import { CreateCollectionButton } from "../../../components/CreateCollectionButton";
import { ScrollView, YStack } from "tamagui";
import { Link } from "expo-router";

export default function ProfileScreen() {
  const { collections } = useContext(DatabaseContext);

  // TODO: change this to show events, group them by date.
  return (
    <ScrollView style={styles.container}>
      {/* TODO: show profile information */}
      {<CreateCollectionButton />}
      <YStack style={styles.collections}>
        {collections.map((collection) => (
          // TODO: styling is messing up without "asChild" but then the link doesn't work
          <Link
            href={{
              pathname: "/collection/[id]",
              params: { id: collection.id },
            }}
            key={collection.id}
            asChild
          >
            <Pressable style={styles.contentContainer}>
              <CollectionSummary key={collection.id} collection={collection} />
            </Pressable>
          </Link>
        ))}
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: "10%",
    paddingBottom: 0,
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
  collections: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 48,
    gap: 8,
    paddingTop: 16,
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
});
