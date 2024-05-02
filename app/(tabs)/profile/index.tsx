import dayjs from "dayjs";
import * as Application from "expo-application";
import { useContext, useState } from "react";
import { Image, Linking, SafeAreaView } from "react-native";
import { Avatar, H3, ScrollView, Spinner, YStack } from "tamagui";
import {
  Icon,
  LinkButton,
  StyledButton,
  StyledParagraph,
  StyledText,
} from "../../../components/Themed";
import { ArenaChannelMultiSelect } from "../../../components/arena/ArenaChannelMultiSelect";
import { ArenaChannelSummary } from "../../../components/arena/ArenaChannelSummary";
import { stringToColor } from "../../../utils";
import { ArenaChannelInfo } from "../../../utils/arena";
import { DatabaseContext } from "../../../utils/db";
import { UserContext } from "../../../utils/user";
import { ArenaLogin } from "../../../views/ArenaLogin";
import { InternalDevTools } from "../../../views/InternalDevTools";
import { getAppIconSource } from "../../icons";
import { useFocusEffect } from "expo-router";

const Subject = `[Gather] feedback`;
const Body = `I wish|like|want|dislike...`;
const FeedbackLink = `mailto:spencerc99@gmail.com?subject=${encodeURIComponent(
  Subject
)}&body=${encodeURIComponent(Body)}`;

export default function ProfileScreen() {
  const { tryImportArenaChannel } = useContext(DatabaseContext);

  const { currentUser } = useContext(UserContext);

  const [selectedChannels, setSelectedChannels] = useState<ArenaChannelInfo[]>(
    []
  );

  async function importSelectedChannels() {
    // TODO: this would ideally do it in the background asynchronously
    setIsLoading(true);
    try {
      await Promise.all(
        selectedChannels.map(
          async (channel) => await tryImportArenaChannel(channel.id.toString())
        )
      ).then(() => {
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

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [appIconSource, setAppIconSource] = useState(null);
  useFocusEffect(() => {
    setAppIconSource(getAppIconSource());

    return () => {
      setAppIconSource(null);
    };
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <YStack gap="$2" padding="10%">
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
          {selectedChannels.length > 0 && (
            <YStack gap="$1.5">
              {selectedChannels.map((channel) => (
                <ArenaChannelSummary
                  channel={channel}
                  key={channel.id.toString()}
                  viewProps={{ backgroundColor: "$green4" }}
                />
              ))}
            </YStack>
          )}
          {selectedChannels.length > 0 && (
            <StyledButton
              icon={isLoading ? <Spinner size="small" /> : null}
              disabled={!selectedChannels.length || isLoading}
              onPress={importSelectedChannels}
              alignSelf="flex-end"
            >
              {isLoading
                ? `Importing ${selectedChannels.length} channels...`
                : `Import ${selectedChannels.length} channels`}
            </StyledButton>
          )}

          <H3>Gather</H3>
          <LinkButton
            flex={1}
            width="100%"
            href="/icons"
            justifyContent="flex-start"
            icon={
              <Image
                source={appIconSource}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                }}
              />
            }
          >
            App Icons
          </LinkButton>
          <StyledButton
            justifyContent="flex-start"
            icon={<Icon name="mail" />}
            onPress={() => {
              Linking.openURL(FeedbackLink).catch((error) => {
                console.log(error);
              });
            }}
          >
            Send Feedback
          </StyledButton>
          <StyledButton
            icon={<Icon name="gift" />}
            onPress={() => {
              Linking.openURL(
                "https://buy.stripe.com/8wMg1p8gjf2g2m4bIN"
              ).catch((error) => {
                console.log(error);
              });
            }}
            backgroundColor="$orange8"
            justifyContent="flex-start"
          >
            Support Development
          </StyledButton>
          {/* <LinkButton>Share</LinkButton> */}
          {/* <StyledButton>
        What's new
      </StyledButton> */}

          <StyledParagraph>
            Thank you for giving your space and time to this app.
          </StyledParagraph>
          <YStack alignItems="center">
            <Image
              source={appIconSource}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
              }}
            />
            <StyledText>
              {Application.nativeApplicationVersion} (
              {Application.nativeBuildVersion})
            </StyledText>
          </YStack>
          <InternalDevTools isLoading={isLoading} setIsLoading={setIsLoading} />
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
