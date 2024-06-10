import dayjs from "dayjs";
import * as Application from "expo-application";
import { useContext, useMemo, useState } from "react";
import { Image, SafeAreaView, useColorScheme } from "react-native";
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
import { getAppIconSource } from "../../icons";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Contribution, Flower } from "../../../components/SlidingScalePayment";
import { ContributionsKey, getItem } from "../../../utils/asyncStorage";
import { useIsFocused } from "@react-navigation/native";
import { ErrorsContext } from "../../../utils/errors";
import { HelpGuideUrl } from "../../../utils/constants";

const DefaultAppSrc = require(`../../../assets/images/icon.png`);

export default function ProfileScreen() {
  const { tryImportArenaChannel } = useContext(DatabaseContext);

  const { currentUser } = useContext(UserContext);
  const colorScheme = useColorScheme();
  const today = dayjs();
  const started = currentUser?.createdAt ? dayjs(currentUser.createdAt) : today;
  const daysUsedApp = today.diff(started, "day");
  const { logError } = useContext(ErrorsContext);

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
      logError(error);
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

  const [appIconSource, setAppIconSource] = useState(DefaultAppSrc);
  useFocusEffect(() => {
    setAppIconSource(getAppIconSource());

    return () => {
      setAppIconSource(null);
    };
  });

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
                  backgroundColor={stringToColor(currentUser?.email)}
                />
              </Avatar>
              <StyledText title>{currentUser.email}</StyledText>
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
            href={HelpGuideUrl}
            theme="gray"
            backgroundColor={colorScheme === "light" ? "$gray5" : undefined}
            icon={<Icon name="document-text" />}
            justifyContent="flex-start"
          >
            Guide
          </LinkButton>
          <LinkButton
            justifyContent="flex-start"
            icon={<Icon name="heart" />}
            flex={1}
            width="100%"
            href="/support"
            theme="green"
          >
            Support development
          </LinkButton>
          <LinkButton
            href="/feedback"
            justifyContent="flex-start"
            theme="purple"
            icon={<Icon name="mail" />}
          >
            Give feedback
          </LinkButton>
          <LinkButton
            flex={1}
            width="100%"
            href="/icons"
            justifyContent="flex-start"
            icon={
              appIconSource ? (
                <Image
                  source={appIconSource}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                  }}
                />
              ) : null
            }
          >
            App icons
          </LinkButton>
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
          <LinkButton
            marginTop="$8"
            alignSelf="center"
            href="/dev"
            size="$medium"
            theme="gray"
            icon={<Icon name="code" />}
          >
            Internal Developer Tools
          </LinkButton>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
