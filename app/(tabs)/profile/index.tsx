import dayjs from "dayjs";
import * as Application from "expo-application";
import { useContext, useMemo, useState } from "react";
import { Animated, Image, useColorScheme } from "react-native";
import {
  Avatar,
  GetProps,
  H5,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Flower } from "../../../components/SlidingScalePayment";
import { ErrorsContext } from "../../../utils/errors";
import { HelpGuideUrl } from "../../../utils/constants";
import { useContributions } from "../../../utils/hooks/useContributions";
import { UsageInfo } from "../../../components/UsageInfo";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { promptForReview } from "../../../utils/celebrations";

const DefaultAppSrc = require(`../../../assets/images/icon.png`);

export default function ProfileScreen() {
  const { tryImportArenaChannel } = useContext(DatabaseContext);
  const { currentUser } = useContext(UserContext);
  const colorScheme = useColorScheme();
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
        setSelectedChannels([]);
        alert(`Imported ${selectedChannels.length} channels`);
      });
    } catch (error) {
      logError(error);
      // throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const contributions = useContributions();
  const hasContributed = useMemo(
    () => (contributions?.length || 0) > 0,
    [contributions]
  );

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
            // @ts-ignore
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
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top,
      }}
    >
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
            <YStack alignItems="center" gap={0}>
              <StyledText metadata>
                joined on {dayjs(currentUser.createdAt).format("MM/DD/YY")}
              </StyledText>
              {hasContributed && (
                <XStack alignItems="center">
                  {/* @ts-ignore */}
                  <Icon name="heart" color="$red9" />
                  <StyledText
                    metadata
                    alignItems="center"
                    verticalAlign={"middle"}
                  >
                    {" "}
                    contributor
                  </StyledText>
                </XStack>
              )}
            </YStack>
            {flowers}
          </YStack>
        )}
        <H5 fontWeight="700">Are.na</H5>
        <ArenaLogin path="profile" />
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

        <H5 fontWeight="700">Gather</H5>
        <UsageInfo />
        <XStack gap="$2">
          <LinkButton
            flex={1}
            width="100%"
            href="/about"
            icon={<Icon name="egg" color="$orange9" />}
            theme="orange"
            backgroundColor={colorScheme === "light" ? "#FFDBB2" : undefined}
            justifyContent="flex-start"
          >
            Origins
          </LinkButton>
        </XStack>
        <XStack gap="$2">
          <LinkButton
            flex={1}
            width="100%"
            href="/settings"
            theme="gray"
            icon={<Icon name="settings" />}
            justifyContent="flex-start"
          >
            Settings
          </LinkButton>
          <LinkButton
            flex={1}
            href="/feedback"
            justifyContent="flex-start"
            theme="gray"
            icon={<Icon name="mail" />}
          >
            Feedback
          </LinkButton>
        </XStack>
        <XStack gap="$2">
          <LinkButton
            flex={1}
            href="/changelog"
            justifyContent="flex-start"
            theme="gray"
            icon={<Icon name="newspaper" />}
          >
            What's new
          </LinkButton>
          <LinkButton
            flex={1}
            width="100%"
            href={HelpGuideUrl}
            theme="gray"
            icon={<Icon name="document-text" />}
            justifyContent="flex-start"
          >
            Guide
          </LinkButton>
        </XStack>
        <Animated.View
          style={{
            position: "relative",
          }}
        >
          <LinkButton
            justifyContent="flex-start"
            icon={<Icon name="heart" color="$red9" />}
            flex={1}
            width="100%"
            href="/support"
          >
            Support development
          </LinkButton>
          {!hasContributed && (
            <>
              <Flower
                style={{
                  position: "absolute",
                  zIndex: 1,
                  top: "-5%",
                  right: "-2%",
                  transform: [{ rotate: "45deg" }],
                }}
                endSize={20}
              />
              <Flower
                style={{
                  position: "absolute",
                  zIndex: 1,
                  bottom: "-10%",
                  right: "7%",
                  transform: [{ rotate: "80deg" }],
                }}
                endSize={20}
              />
              <Flower
                style={{
                  position: "absolute",
                  zIndex: 1,
                  right: "22%",
                  top: "-8%",
                  transform: [{ rotate: "22deg" }],
                }}
                endSize={20}
              />
              <Flower
                style={{
                  position: "absolute",
                  zIndex: 1,
                  left: "-2%",
                  transform: [{ rotate: "180deg" }],
                }}
                endSize={20}
              />
            </>
          )}
        </Animated.View>
        <XStack gap="$2">
          <StyledButton
            theme="blue"
            justifyContent="flex-start"
            icon={<Icon name="gift" color="$yellow11" />}
            flex={1}
            width="100%"
            onPress={async () => {
              await promptForReview();
            }}
          >
            Review
          </StyledButton>
          <DownloadButton
            justifyContent="flex-start"
            theme="gray"
            flex={1}
            width="100%"
          />
        </XStack>

        {/* TODO: select a channel to send? */}
        {/* <StyledButton justifyContent="flex-start">
          Gift a collection
        </StyledButton> */}

        <StyledText>
          Thank you for giving your space and time to this app.
        </StyledText>
        <StyledParagraph>
          For help, mail <StyledParagraph>gather@spencer.place</StyledParagraph>
          .
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
        <YStack gap="$2" marginTop="$8">
          <LinkButton
            href="/dev"
            size="$medium"
            theme="gray"
            alignSelf="center"
            icon={<Icon name="code" />}
          >
            Internal Developer Tools
          </LinkButton>
        </YStack>
      </YStack>
    </ScrollView>
  );
}

function DownloadButton({ ...buttonProps }: GetProps<typeof StyledButton>) {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Get the database file path
      const dbPath = FileSystem.documentDirectory + "SQLite/db.db";

      // Create a temporary file for sharing
      const tempFilePath =
        FileSystem.cacheDirectory +
        `gather_export_${dayjs().format("YYYY-MM-DD")}.db`;

      // Copy the database file to the temporary location
      await FileSystem.copyAsync({
        from: dbPath,
        to: tempFilePath,
      });

      // Check if sharing is available on the device
      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (isSharingAvailable) {
        // Open the sharing dialog
        await Sharing.shareAsync(tempFilePath, {
          mimeType: "application/x-sqlite3",
          dialogTitle: "Export Gather Data",
          UTI: "public.database", // Uniform Type Identifier for macOS
        });
      } else {
        alert("Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <StyledButton
      icon={isExporting ? <Spinner size="small" /> : <Icon name="download" />}
      onPress={exportData}
      disabled={isExporting}
      {...buttonProps}
    >
      {isExporting ? "Exporting..." : "Export data"}
    </StyledButton>
  );
}
