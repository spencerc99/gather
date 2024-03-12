import { StatusBar } from "expo-status-bar";
import { Image, Linking, Platform, SafeAreaView } from "react-native";
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
  Stack,
  View,
  XStack,
  YStack,
} from "tamagui";
import * as Application from "expo-application";
import { DatabaseContext } from "../../../utils/db";
import {
  ButtonWithConfirm,
  Icon,
  StyledButton,
  StyledLabel,
  StyledParagraph,
  StyledText,
} from "../../../components/Themed";
import { useContext, useEffect, useState } from "react";
import { ArenaLogin } from "../../../views/ArenaLogin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext, UserInfoId } from "../../../utils/user";
import { stringToColor } from "../../../utils";
import dayjs from "dayjs";
import { ArenaChannelMultiSelect } from "../../../components/arena/ArenaChannelMultiSelect";
import { ArenaChannelSummary } from "../../../components/arena/ArenaChannelSummary";
import { ArenaChannelInfo } from "../../../utils/arena";

const Subject = `[Gather] feedback`;
const Body = `I wish|like|want|dislike...`;
const FeedbackLink = `mailto:spencerc99@gmail.com?subject=${encodeURIComponent(
  Subject
)}&body=${encodeURIComponent(Body)}`;

export default function ProfileScreen() {
  const {
    db,
    fetchBlocks,
    fetchCollections,
    trySyncPendingArenaBlocks,
    trySyncNewArenaBlocks,
    getPendingArenaBlocks,
    arenaAccessToken,
    tryImportArenaChannel,
  } = useContext(DatabaseContext);

  const { currentUser } = useContext(UserContext);

  const [pendingArenaBlocks, setPendingArenaBlocks] = useState<any>([]);
  const [selectedChannels, setSelectedChannels] = useState<ArenaChannelInfo[]>(
    []
  );
  const [showInternalTools, setShowInternalTools] = useState(false);
  async function importSelectedChannels() {
    // TODO: this would ideally do it in the background asynchronously
    setIsLoading(true);
    try {
      await Promise.all(
        selectedChannels.map(
          async (channel) => await tryImportArenaChannel(channel.id.toString())
        )
      ).then(() => {
        fetchCollections();
        alert(`Imported ${selectedChannels.length} channels`);
        setSelectedChannels([]);
      });
    } catch (error) {
      console.error(error);
      // throw error;
    } finally {
      setIsLoading(false);
    }
  }

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
    <SafeAreaView>
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
              <Avatar.Fallback
                backgroundColor={stringToColor(currentUser?.id)}
              />
            </Avatar>
            <StyledText title>{currentUser.id}</StyledText>
            <YStack alignItems="center" space="$1">
              <StyledText metadata>
                joined on {dayjs(currentUser.createdAt).format("MM/DD/YYYY")}
              </StyledText>
            </YStack>
          </YStack>
        )}
        <H3>Are.na</H3>
        <ArenaLogin path="internal" />
        <ArenaChannelMultiSelect
          setSelectedChannels={setSelectedChannels}
          selectedChannels={selectedChannels}
        />
        <YStack space="$1.5">
          {selectedChannels.map((channel) => (
            <Stack backgroundColor="$green4" key={channel.id.toString()}>
              <ArenaChannelSummary
                channel={channel}
                viewProps={{
                  borderWidth: 0.5,
                }}
              />
            </Stack>
          ))}
        </YStack>
        <StyledButton
          icon={isLoading ? <Spinner size="small" /> : null}
          disabled={!selectedChannels.length || isLoading}
          onPress={importSelectedChannels}
        >
          {isLoading
            ? `Importing ${selectedChannels.length} channels...`
            : `Import ${selectedChannels.length} channels`}
        </StyledButton>

        <H3>Gather</H3>
        {/* Add ability to change icon */}
        <StyledButton
          icon={<Icon name="gift" />}
          onPress={() => {
            Linking.openURL(FeedbackLink).catch((error) => {
              console.log(error);
            });
          }}
        >
          Send me Feedback
        </StyledButton>
        {/* <LinkButton>Share</LinkButton> */}
        {/* <LinkButton>Tip</LinkButton> */}
        {/* <StyledButton>
        What's new
      </StyledButton> */}

        <StyledParagraph>
          Thank you for giving your space and time to try this app.
        </StyledParagraph>
        <YStack alignItems="center">
          <Image
            source={require("../../../assets/images/icon.png")}
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
            }}
          />
          <StyledText>
            {Application.nativeApplicationVersion} (
            {Application.nativeBuildVersion})
          </StyledText>
        </YStack>
        <H3>
          Internal Dev Tools{" "}
          <StyledButton
            onPress={() => setShowInternalTools(!showInternalTools)}
            circular
            size="$5"
            theme="white"
            backgroundColor="$gray6"
            icon={
              <Icon name={showInternalTools ? "chevron-up" : "chevron-down"} />
            }
          ></StyledButton>
        </H3>
        {showInternalTools && (
          <YStack space="$2">
            <StyledText>
              These are available for testing and debugging purposes. If you run
              into any issues, please contact Spencer first, and he might direct
              you to these buttons if there are issues :)
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
            <StyledParagraph>
              Only do this if directed to do it in order to reset your schemas.
              It will delete all your data.
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
            {__DEV__ && (
              <YStack space="$1">
                <H3>pending blocks</H3>
                <StyledParagraph>
                  {JSON.stringify(pendingArenaBlocks, null, 2)}
                </StyledParagraph>
              </YStack>
            )}
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
    </SafeAreaView>
  );
}
