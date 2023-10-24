import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { Adapt, H2, H3, Label, Progress, Select, Sheet, View } from "tamagui";
import { DatabaseContext } from "../utils/db";
import {
  ButtonWithConfirm,
  StyledButton,
  StyledInput,
  StyledParagraph,
} from "../components/Themed";
import { useContext, useState } from "react";
import { CollectionSelect } from "../components/CollectionSelect";
import { arenaClassToMimeType, getChannelContents } from "../utils/arena";
import { currentUser } from "../utils/user";

export default function ModalScreen() {
  const { db, initDatabases, createCollection, createBlock } =
    useContext(DatabaseContext);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [arenaChannel, setArenaChannel] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  async function onImportChannel() {
    setIsLoading(true);
    try {
      const { title, id, contents } = await getChannelContents(arenaChannel);
      let collectionId = selectedCollection;
      if (!collectionId) {
        collectionId = await createCollection({
          title,
          createdBy: currentUser().id,
          // TODO: needs to handle source provenance
        });
      }

      // add blocks
      const blockIds = await Promise.all(
        contents.map(async (block) => {
          const blockId = createBlock({
            title: block.title,
            description: block.description,
            content: block.image?.display.url || block.content,
            type: arenaClassToMimeType(block.class),
            source: block.source?.url,
            createdBy: currentUser().id,
            remoteSourceType: JSON.stringify({
              source: "arena",
              remoteId: block.id,
            }),
            collectionsToConnect: [collectionId!],
          });
          return blockId;
        })
      );
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View padding="10%" space="$2">
      <H2>Internal Developer Settings</H2>
      <H3>Are.na</H3>
      <Label>Target Are.na channel</Label>
      <StyledInput
        value={arenaChannel}
        onChangeText={(text) => setArenaChannel(text)}
        placeholder="https://are.na/spencer-chang/basket-sjuhif_oeqk"
      />
      <Label>Local collection to import to (optional)</Label>
      <CollectionSelect
        selectedCollection={selectedCollection}
        setSelectedCollection={setSelectedCollection}
      />
      <StyledButton
        onPress={async () => {
          await onImportChannel();
        }}
        disabled={isLoading}
        icon={isLoading ? <Progress /> : null}
      >
        Import Channel
      </StyledButton>
      {/* <ButtonWithConfirm
        onPress={() => {
          console.log("wee??");
        }}
      >
        Test Confirm
      </ButtonWithConfirm> */}
      {/* TODO: bring this back when working */}
      {/* <H3>Databases</H3>
      <StyledParagraph>
        You might want to reset your database to get the new schemas (sorry no
        migrations lol).
      </StyledParagraph> */}
      {/* <ButtonWithConfirm
        disabled={isLoading}
        icon={isLoading ? <Progress /> : null}
        theme="red"
        backgroundColor="$red8"
        onPress={async () => {
          setIsLoading(true);
          try {
            const results = await db.execAsync(
              [
                { sql: `DROP TABLE IF EXISTS collections;`, args: [] },
                { sql: `DROP TABLE IF EXISTS blocks;`, args: [] },
                { sql: `DROP TABLE IF EXISTS connections;`, args: [] },
              ],
              false
            );

            results
              .filter((result) => "error" in result)
              .forEach((result) => {
                throw result;
              });
            await initDatabases();
          } catch (err) {
            throw err;
          } finally {
            setIsLoading(false);
          }
        }}
      >
        Reset Databases
      </ButtonWithConfirm> */}
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}
