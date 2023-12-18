import { StatusBar } from "expo-status-bar";
import { Keyboard, Platform } from "react-native";
import {
  Avatar,
  AlertDialog,
  H2,
  H3,
  Label,
  ScrollView,
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
  StyledLabel,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import { useContext, useEffect, useState } from "react";
import { ArenaLogin } from "../views/ArenaLogin";
import { ImportArenaChannelSelect } from "../components/ImportArenaChannelSelect";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext, UserInfoId } from "../utils/user";
import { stringToColor } from "../utils";
import dayjs from "dayjs";

export default function ModalScreen() {
  const {
    db,
    fetchBlocks,
    fetchCollections,
    trySyncPendingArenaBlocks,
    trySyncNewArenaBlocks,
    getPendingArenaBlocks,
    arenaAccessToken,
  } = useContext(DatabaseContext);

  const { currentUser } = useContext(UserContext);

  const [pendingArenaBlocks, setPendingArenaBlocks] = useState<any>([]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    getPendingArenaBlocks().then((result) =>
      setPendingArenaBlocks(result.rows)
    );
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <ScrollView padding="10%" space="$2">
      {currentUser && (
        <YStack space="$2" padding="$4" alignItems="center" paddingTop={0}>
          <Avatar size="$6" circular>
            {/* <Avatar.Image
            // accessibilityLabel={user.name}
            // src={user.imgSrc}
            src={
              "https://images.unsplash.com/photo-1548142813-c348350df52b?&w=150&h=150&dpr=2&q=80"
            }
          /> */}
            <Avatar.Fallback backgroundColor={stringToColor(currentUser?.id)} />
          </Avatar>
          <StyledText title>{currentUser.id}</StyledText>
          <YStack alignItems="center" space="$1">
            <StyledText metadata>
              joined on {dayjs(currentUser.createdAt).format("MM/DD/YYYY")}
            </StyledText>
          </YStack>
        </YStack>
      )}
      <H3>Are.na Settings</H3>
      <ArenaLogin path="internal" />
      <ImportArenaChannelSelect {...{ isLoading, setIsLoading }} />
      <H3>Internal Developer Tools</H3>
      <StyledText>
        These are available for testing and debugging purposes. If you run into
        any issues, please contact Spencer first, and he might direct you to
        these buttons if there are issues :)
      </StyledText>
      <StyledButton
        disabled={isLoading}
        onPress={async () => {
          setIsLoading(true);
          try {
            await trySyncPendingArenaBlocks();
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <StyledParagraph>
          Sync to Arena ({pendingArenaBlocks.length} pending)
        </StyledParagraph>
      </StyledButton>
      <StyledButton
        disabled={isLoading}
        onPress={async () => {
          setIsLoading(true);
          try {
            await trySyncNewArenaBlocks();
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <StyledParagraph>Sync from Arena</StyledParagraph>
      </StyledButton>
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
            // await initDatabases();
          } catch (err) {
            throw err;
          } finally {
            setIsLoading(false);
          }
        }}
      >
        Reset Databases
      </StyledButton>
      <XStack>
        <StyledLabel bold>Token</StyledLabel>
        <StyledParagraph ellipse>{arenaAccessToken}</StyledParagraph>
      </XStack>
      <StyledButton
        onPress={() => {
          AsyncStorage.setItem("seenIntro", "false");
        }}
      >
        Reset intro seen
      </StyledButton>
      <StyledButton
        onPress={() => {
          AsyncStorage.removeItem(UserInfoId);
        }}
      >
        Clear user
      </StyledButton>
      {__DEV__ && (
        <YStack space="$1">
          <H3>pending blocks</H3>
          <StyledParagraph>
            {JSON.stringify(pendingArenaBlocks, null, 2)}
          </StyledParagraph>
        </YStack>
      )}
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
    </ScrollView>
  );
}
