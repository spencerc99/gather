import { StatusBar } from "expo-status-bar";
import { Keyboard, Platform } from "react-native";
import {
  Adapt,
  AlertDialog,
  H2,
  H3,
  Label,
  Select,
  Sheet,
  Spinner,
  Theme,
  View,
  XStack,
  YStack,
} from "tamagui";
import { DatabaseContext } from "../utils/db";
import {
  ButtonWithConfirm,
  StyledButton,
  StyledInput,
  StyledLabel,
  StyledParagraph,
  StyledTextArea,
} from "../components/Themed";
import { useContext, useState } from "react";
import { CollectionSelect } from "../components/CollectionSelect";
import {
  arenaClassToBlockType,
  arenaClassToMimeType,
  getChannelContents,
} from "../utils/arena";
import { currentUser } from "../utils/user";
import { RemoteSourceType } from "../utils/dataTypes";
import { ArenaLogin, SelectArenaChannel } from "../views/ArenaLogin";

export default function ModalScreen() {
  const {
    db,
    initDatabases,
    fetchBlocks,
    fetchCollections,
    createCollection,
    createBlocks,
  } = useContext(DatabaseContext);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [arenaChannel, setArenaChannel] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  async function onImportChannel() {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const { title, id, contents } = await getChannelContents(arenaChannel);
      let collectionId = selectedCollection;
      if (!collectionId) {
        collectionId = await createCollection({
          title,
          createdBy: currentUser().id,
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: id.toString(),
            arenaClass: "Collection",
          },
        });
      }

      // add blocks
      const blockIds = await createBlocks({
        blocksToInsert: contents.map((block) => ({
          title: block.title,
          description: block.description,
          content:
            block.attachment?.url ||
            // TODO: this is not defined... see arena.ts for example. at least for tiktok videos,
            // it only provides the html iframe code..
            block.embed?.url ||
            block.image?.display.url ||
            block.content,
          type: arenaClassToBlockType(block),
          contentType: arenaClassToMimeType(block),
          source: block.source?.url,
          createdBy: currentUser().id,
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: block.id,
            arenaClass: "Block",
            connectedAt: block.connected_at,
          },
        })),
        collectionId: collectionId!,
      });
      setArenaChannel("");
      // TODO: this should not be needed because `createCollection` calls it
      // but for some reason not showing up.. maybe a read-replica thing?
      fetchCollections();
      // TODO: add toast saying success with new collection name and how many blocks created
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View padding="10%" space="$2">
      <H3>Are.na Settings</H3>
      <ArenaLogin />
      <Label>Target Are.na channel</Label>
      <SelectArenaChannel
        setArenaChannel={setArenaChannel}
        arenaChannel={arenaChannel}
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
        disabled={isLoading || !arenaChannel}
        icon={isLoading ? <Spinner size="small" /> : null}
      >
        Import Channel
      </StyledButton>
      <H3>Internal Developer Settings</H3>
      <StyledButton disabled={isLoading} onPress={fetchCollections}>
        Refresh Collections
      </StyledButton>
      <StyledButton disabled={isLoading} onPress={fetchBlocks}>
        Refresh Blocks
      </StyledButton>
      <StyledParagraph>
        Only do this if directed to do it in order to reset your schemas. It
        will delete all your data.
      </StyledParagraph>
      <StyledButton
        disabled={isLoading}
        icon={isLoading ? <Spinner size="small" /> : null}
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
      </StyledButton>
      {/* TODO: bring this back when working */}
      {/* <ButtonWithConfirm
        disabled={isLoading}
        icon={isLoading ? <Spinner size="small" /> : null}
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
