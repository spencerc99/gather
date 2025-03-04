import { StatusBar } from "expo-status-bar";
import { Link, router } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { H3, View, YStack } from "tamagui";
import {
  StyledButton,
  StyledText,
  StyledParagraph,
  ExternalLinkText,
} from "../components/Themed";
import { useContext, useState } from "react";
import { PortalProvider } from "tamagui";
import { ImportArenaChannelSelect } from "../components/ImportArenaChannelSelect";
import { UserContext } from "../utils/user";
import { RapidCreateCollection } from "../components/RapidCreateCollection";

export default function ModalScreen() {
  // TODO: type the diff modals by the pathname?

  return (
    // TODO: maybe add shouldAddRootHost ?
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { arenaAccessToken } = useContext(UserContext);

  return (
    <YStack style={styles.createCollection}>
      <H3>Create Collection</H3>
      <RapidCreateCollection />
      {/* TODO: add button to fill it with a random one */}
      <StyledParagraph>
        If you need collection name ideas, get some inspiration from this{" "}
        <ExternalLinkText href="https://www.are.na/spencer-chang/gather-good-channels-to-play-with">
          are.na channel
        </ExternalLinkText>
        .
      </StyledParagraph>
      <H3>or Import</H3>
      {!arenaAccessToken ? (
        // TODO: this is jank, the select collections modal is still open after this
        <StyledText color="$gray9">
          <Link
            href="/(tabs)/profile"
            onPress={() => {
              router.push("..");
            }}
          >
            <StyledText link>Login to Are.na</StyledText>
          </Link>{" "}
          to import one of your channels
        </StyledText>
      ) : (
        <>
          {/* TODO: this is jank, the select collections modal is still open after this
           */}
          <StyledText>
            or{" "}
            <Link href="/(tabs)/profile">
              <StyledText link>import multiple...</StyledText>
            </Link>
          </StyledText>
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
        </>
      )}
      <StyledButton
        onPress={async () => {
          router.replace("..");
        }}
        disabled={isLoading}
      >
        Done
      </StyledButton>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    marginTop: "10%",
    zIndex: 1000,
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
