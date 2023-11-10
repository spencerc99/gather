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
  StyledParagraph,
} from "../components/Themed";
import { useContext, useState } from "react";
import { ArenaLogin } from "../views/ArenaLogin";
import { ImportArenaChannelSelect } from "../components/ImportArenaChannelSelect";

export default function ModalScreen() {
  const { db, initDatabases, fetchBlocks, fetchCollections } =
    useContext(DatabaseContext);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <View padding="10%" space="$2">
      <H3>Are.na Settings</H3>
      <ArenaLogin />
      <Label>Target Are.na channel</Label>
      <ImportArenaChannelSelect {...{ isLoading, setIsLoading }} />
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
