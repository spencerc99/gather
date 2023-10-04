import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";
import { View, YStack } from "tamagui";
import { Button, Text, TextArea, Input } from "../components/Themed";
import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { currentUser } from "../utils/user";

export default function ModalScreen() {
  // TODO: type the diff modals by the pathname?

  return (
    <View style={styles.container}>
      <CreateCollectionModal />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

function CreateCollectionModal() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { createCollection } = useContext(DatabaseContext);
  const user = currentUser();

  return (
    <YStack style={styles.container}>
      <Text style={styles.title}>Create Collection</Text>
      <Input
        placeholder="I want to remember this"
        value={title}
        onChangeText={(text) => setTitle(text)}
      />
      <TextArea
        placeholder="a channel for remembering"
        value={description}
        onChangeText={(text) => setDescription(text)}
      />
      <Button
        title="Create"
        onPress={() =>
          createCollection({ title, description, createdBy: user.id })
        }
        disabled={!title}
        style={{ marginLeft: "auto" }}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 8,
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
