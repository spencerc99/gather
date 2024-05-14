import dayjs from "dayjs";
import * as Application from "expo-application";
import { useContext, useEffect, useMemo, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { Contribution, Flower } from "../../../components/SlidingScalePayment";
import { ContributionsKey, getItem } from "../../../utils/asyncStorage";
import { useIsFocused } from "@react-navigation/native";

const Subject = `[Gather] feedback`;
const Body = `I wish|like|want|dislike...`;
const FeedbackLink = `mailto:spencerc99@gmail.com?subject=${encodeURIComponent(
  Subject
)}&body=${encodeURIComponent(Body)}`;

export default function ProfileScreen() {
  const { tryImportArenaChannel } = useContext(DatabaseContext);

  const { currentUser } = useContext(UserContext);
  const today = dayjs();
  const started = currentUser?.createdAt ? dayjs(currentUser.createdAt) : today;
  const daysUsedApp = today.diff(started, "day");

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
  const { data: contributions } = useQuery<Contribution[]>({
    queryKey: [ContributionsKey],
    queryFn: () => {
      return getItem<Contribution[]>(ContributionsKey) || [];
    },
  });

  const [appIconSource, setAppIconSource] = useState(null);
  useFocusEffect(() => {
    setAppIconSource(getAppIconSource());

    return () => {
      setAppIconSource(null);
    };
  });

  const isFocused = useIsFocused();
  const numFlowers = contributions?.length || 0;
  const flowers = useMemo(
    () =>
      Array.from({ length: numFlowers }, (_, index) => {
        const topOrBottom = Math.random() > 0.5 ? "top" : "bottom";
        const leftOrRight = Math.random() > 0.5 ? "left" : "right";
        return (
          <Flower
            key={`${index}`}
            style={{
              position: "absolute",
              zIndex: -1,
              [topOrBottom]: Math.random() * 10,
              [leftOrRight]: `${Math.random() * 40}%`,
              transform: [{ rotate: `${Math.random() * 90 - 45}deg` }],
              opacity: 0.9,
            }}
          />
        );
      }),
    [numFlowers]
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <YStack gap="$2" padding="10%" position="relative">
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
                  joined on {dayjs(currentUser.createdAt).format("MM/DD/YY")},{" "}
                  {daysUsedApp} days ago
                </StyledText>
              </YStack>
              {flowers}
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
            href="/about"
            icon={<Icon name="egg" />}
            theme="orange"
            backgroundColor="$orange6"
            justifyContent="flex-start"
          >
            Origins
          </LinkButton>
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
            App icons
          </LinkButton>
          <LinkButton
            justifyContent="flex-start"
            icon={<Icon name="gift" />}
            flex={1}
            width="100%"
            href="/support"
          >
            Support development
          </LinkButton>
          <StyledButton
            justifyContent="flex-start"
            icon={<Icon name="mail" />}
            onPress={() => {
              // TODO: handle if mail not installed.. should probably just be a coda form
              Linking.openURL(FeedbackLink).catch((error) => {
                console.log(error);
              });
            }}
          >
            Send feedback
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
