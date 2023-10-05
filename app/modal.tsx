import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { View, YStack } from "tamagui";
import {
  StyledButton,
  StyledText,
  StyledTextArea,
  StyledInput,
} from "../components/Themed";
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
    <YStack style={styles.createCollection}>
      <StyledText style={styles.title}>Create Collection</StyledText>
      <StyledInput
        placeholder="I want to remember this"
        value={title}
        onChangeText={(text) => setTitle(text)}
      />
      <StyledTextArea
        placeholder="a channel for remembering"
        value={description}
        onChangeText={(text) => setDescription(text)}
      />
      <StyledButton
        onPress={async () => {
          await createCollection({ title, description, createdBy: user.id });
          router.replace("..");
        }}
        disabled={!title}
        style={{ marginLeft: "auto" }}
        size="$4"
      >
        Create
      </StyledButton>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "10%",
  },
  createCollection: {
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
