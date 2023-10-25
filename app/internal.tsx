import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import {
  Adapt,
  AlertDialog,
  H2,
  H3,
  Label,
  Progress,
  Select,
  Sheet,
  View,
  XStack,
  YStack,
} from "tamagui";
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
import { RemoteSourceType } from "../utils/dataTypes";

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
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: id.toString(),
            arenaClass: "Collection",
          },
        });
      }

      // add blocks
      const blockIds = await Promise.all(
        contents.map(async (block) => {
          const blockId = createBlock({
            title: block.title,
            description: block.description,
            content:
              block.attachment?.url ||
              block.embed?.url ||
              block.image?.display.url ||
              block.content,
            type: arenaClassToMimeType(block),
            source: block.source?.url,
            createdBy: currentUser().id,
            remoteSourceType: RemoteSourceType.Arena,
            remoteSourceInfo: {
              arenaId: block.id,
              arenaClass: "Block",
            },
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

      <AlertDialog native>
        <AlertDialog.Trigger asChild>
          <StyledButton onPress={() => console.log("been pressed")}>
            HI
          </StyledButton>
        </AlertDialog.Trigger>

        <Adapt when="sm" platform="touch">
          <Sheet
            // animation="medium"
            // zIndex={200000}
            modal
            dismissOnSnapToBottom
            native
          >
            <Sheet.Frame padding="$4" gap="$4">
              <Adapt.Contents />
            </Sheet.Frame>
            <Sheet.Overlay
            // animation="lazy"
            // enterStyle={{ opacity: 0 }}
            // exitStyle={{ opacity: 0 }}
            />
          </Sheet>
        </Adapt>

        <AlertDialog.Portal>
          <AlertDialog.Overlay
          // key="overlay"
          // animation="quick"
          // opacity={0.5}
          // enterStyle={{ opacity: 0 }}
          // exitStyle={{ opacity: 0 }}
          />
          <AlertDialog.Content
            bordered
            elevate
            // key="content"
            // animation={[
            //   "quick",
            //   {
            //     opacity: {
            //       overshootClamping: true,
            //     },
            //   },
            // ]}
            // enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            // exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            // x={0}
            // scale={1}
            // opacity={1}
            // y={0}
          >
            <YStack space>
              <AlertDialog.Title>hi</AlertDialog.Title>
              <AlertDialog.Description>wee</AlertDialog.Description>
              <XStack space="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <StyledButton>cancelText</StyledButton>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <StyledButton
                    onPress={() => {
                      console.log("hello");
                    }}
                    theme="active"
                  >
                    Confirm
                  </StyledButton>
                </AlertDialog.Action>
              </XStack>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>

      {/* TODO: bring this back when working */}
      <H3>Databases</H3>
      <StyledParagraph>
        You might want to reset your database to get the new schemas (sorry no
        migrations lol).
      </StyledParagraph>
      <StyledButton
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
      </StyledButton>
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
