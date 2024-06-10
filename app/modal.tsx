import { StatusBar } from "expo-status-bar";
import { Link, router } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { H3, View, YStack } from "tamagui";
import { StyledButton, StyledText, StyledInput } from "../components/Themed";
import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { PortalProvider } from "tamagui";
import { ImportArenaChannelSelect } from "../components/ImportArenaChannelSelect";
import { UserContext } from "../utils/user";

export default function ModalScreen() {
  // TODO: type the diff modals by the pathname?

  return (
    <PortalProvider>
      <View style={styles.container}>
        <CreateCollectionModal />

        {/* Use a light status bar on iOS to account for the black space above the modal */}
        <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      </View>
    </PortalProvider>
  );
}

// TODO: rename file to createCollection
function CreateCollectionModal() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { createCollection } = useContext(DatabaseContext);
  const { currentUser: user, arenaAccessToken } = useContext(UserContext);

  return (
    <YStack style={styles.createCollection}>
      <H3>Create Collection</H3>
      <StyledInput
        placeholder="I want to remember this"
        value={title}
        onChangeText={(text) => setTitle(text)}
        returnKeyType="done"
      />
      {/* <StyledTextArea
        placeholder="a channel for remembering"
        value={description}
        minHeight={100}
        onChangeText={(text) => setDescription(text)}
      /> */}
      <StyledButton
        onPress={async () => {
          await createCollection({ title, description, createdBy: user!.id });
          router.replace("..");
        }}
        disabled={!title}
        // style={{ marginLeft: "auto" }}
      >
        Create
      </StyledButton>
      <H3>or Import</H3>
      {!arenaAccessToken ? (
        // TODO: this is jank, the select collections modal is still open after this
        <StyledText color="$gray9">
          <Link
            href="/profile"
            onPress={() => {
              router.push("..");
            }}
          >
            <StyledText link>Login to Are.na</StyledText>
          </Link>{" "}
          to import one of your channels
        </StyledText>
      ) : (
        <ImportArenaChannelSelect
          {...{
            isLoading,
            setIsLoading,
            onSuccess: () => {
              router.replace("..");
            },
          }}
          frameProps={{
            marginLeft: "-10%",
            width: "120%",
          }}
          overlayProps={{
            height: "126%",
            width: "126%",
            marginLeft: "-13%",
            marginTop: "-13%",
          }}
          modal={false}
        />
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    marginTop: "10%",
  },
  createCollection: {
    gap: 8,
    height: "100%",
    margin: "10%",
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
