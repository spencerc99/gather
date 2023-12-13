import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  H2,
  YStack,
  XStack,
  Progress,
  ButtonProps,
  Stack,
  Theme,
  Spinner,
} from "tamagui";
import {
  ArenaLogo,
  StyledButton,
  StyledInput,
  StyledText,
} from "../components/Themed";
import { ArenaLogin } from "../views/ArenaLogin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { InspoBlocks } from "../components/BlockTexts";
import { BlockContent } from "../components/BlockContent";
import { Dimensions, Image } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { RawAnimations } from "../animations";
import { DatabaseContext } from "../utils/db";
import { ArenaChannelMultiSelect } from "../components/arena/ArenaChannelMultiSelect";
import { ArenaChannelSummary } from "../components/arena/ArenaChannelSummary";
import { ArenaChannelInfo } from "../utils/arena";
import { UserContext } from "../utils/user";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const NumSteps = 3;
// source https://uibakery.io/regex-library/email
const EmailRegex = /^\S+@\S+\.\S+$/;

export default function IntroScreen() {
  const [step, setStep] = useState<number>(0);
  const router = useRouter();
  const width = Dimensions.get("window").width;
  const { email: savedEmail, updateEmail } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const { arenaAccessToken, fetchCollections, tryImportArenaChannel } =
    useContext(DatabaseContext);
  const [selectedChannels, setSelectedChannels] = useState<ArenaChannelInfo[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [savedEmail]);

  async function importSelectedChannels() {
    // TODO: this would ideally do it in the background asynchronously
    setIsLoading(true);
    try {
      await Promise.all(
        selectedChannels.map((channel) => tryImportArenaChannel(channel))
      ).then(() => {
        fetchCollections();
      });
    } catch (error) {
      console.error(error);
      // throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function nextStep() {
    if (step === NumSteps - 1) {
      await AsyncStorage.setItem("seenIntro", "true");
      router.replace("/home");
    }
    setStep(step + 1);
  }

  function NextStepButton({
    text,
    onPress,
    ...rest
  }: {
    text: string;
    onPress?: () => void;
  } & Partial<ButtonProps>) {
    return (
      <StyledButton
        backgroundColor="$blue8"
        {...rest}
        onPress={async () => {
          await onPress?.();
          nextStep();
        }}
        marginTop="auto"
        marginBottom="10%"
      >
        {text}
      </StyledButton>
    );
  }

  function renderStep() {
    switch (step) {
      case 0:
        // create your ID
        return (
          // TODO: add animated.view to slide in
          <>
            <H2>Welcome to Gather</H2>
            <StyledText marginBottom="$1">
              Your messy space for gathering inspiration, moments, and
              wonderings.
            </StyledText>
            <YStack alignItems="center" marginBottom="$3">
              {/* TODO: allow you to zoom in */}
              <Carousel
                loop
                autoPlay
                autoPlayInterval={2000}
                width={width}
                data={InspoBlocks}
                mode="parallax"
                height={200}
                withAnimation={{
                  type: "spring",
                  config: { ...RawAnimations.lazy } as any,
                }}
                modeConfig={{
                  parallaxScrollingScale: 0.9,
                  parallaxScrollingOffset: 100,
                }}
                style={{
                  backgroundColor: "#FFEDBE",
                }}
                renderItem={({ item, index: idx }) => (
                  <YStack
                    justifyContent="center"
                    height="100%"
                    alignItems="center"
                    paddingHorizontal="$6"
                  >
                    <BlockContent
                      key={idx}
                      {...item}
                      containerStyle={{}}
                      textContainerProps={{
                        padding: 2,
                      }}
                      textProps={{
                        fontSize: "$1",
                      }}
                    />
                  </YStack>
                )}
              />
            </YStack>
            <StyledInput
              placeholder="gather@tiny-inter.net"
              value={email}
              onChangeText={(text) => setEmail(text)}
              inputMode="email"
            ></StyledInput>
            <StyledText metadata>
              This information will not be sent anywhere and is only used to
              create your personal unique identifier.
            </StyledText>
            <NextStepButton
              text="Next"
              disabled={!email || !EmailRegex.test(email)}
              onPress={async () => {
                await updateEmail(email);
              }}
            />
          </>
        );
      case 1:
        return (
          <>
            <StyledText bold fontSize="$6">
              Adding to Are.na <ArenaLogo />
            </StyledText>
            <StyledText>
              Gather stores your data locally on your device. You can optionally
              sync specific collections to Are.na.
            </StyledText>
            {!arenaAccessToken ? (
              <>
                <ArenaLogin path="intro" />
                <StyledText metadata>
                  Logging in allows us to import your channels and add items
                  created in this app. You can revoke your access at any time in
                  settings.
                </StyledText>
              </>
            ) : (
              <>
                <ArenaChannelMultiSelect
                  setSelectedChannels={setSelectedChannels}
                  selectedChannels={selectedChannels}
                />
                <YStack space="$1.5">
                  {selectedChannels.map((channel) => (
                    <Stack
                      backgroundColor="$green4"
                      key={channel.id.toString()}
                    >
                      <ArenaChannelSummary
                        channel={channel}
                        viewProps={{
                          borderWidth: 0.5,
                        }}
                      />
                    </Stack>
                  ))}
                </YStack>
              </>
            )}

            <NextStepButton
              icon={isLoading ? <Spinner size="small" /> : null}
              text={
                isLoading
                  ? `Importing ${selectedChannels.length} channels...`
                  : selectedChannels.length > 1
                  ? `Import ${selectedChannels.length} channels`
                  : arenaAccessToken
                  ? "I'll import later"
                  : "Not now"
              }
              onPress={importSelectedChannels}
            />
          </>
        );
      case 2:
        // collection examples
        return (
          <>
            <StyledText bold fontSize="$6">
              One last tip...
            </StyledText>
            <StyledText fontSize="$4">
              Create collections to start gathering. Treat them as ideas,
              angles, or perspectives you want to continue revisiting.
            </StyledText>
            <YStack space="$1">
              <StyledText fontSize="$4">
                - things you want to remember
              </StyledText>
              <StyledText fontSize="$4">- people watching log</StyledText>
              <StyledText fontSize="$4">- times you said wow</StyledText>
              <StyledText fontSize="$4">- orange things</StyledText>
              <StyledText fontSize="$4">- kindness journal</StyledText>
              <StyledText fontSize="$4">- songs that slap</StyledText>
              <StyledText fontSize="$4">- outfits of the day</StyledText>
              <StyledText fontSize="$4">- morning mood log</StyledText>
            </YStack>
            <NextStepButton text="Start gathering" />
          </>
        );
    }
  }

  return (
    <Theme name="light">
      <KeyboardAwareScrollView style={{ flex: 1 }} extraScrollHeight={70}>
        <YStack
          minHeight="100%"
          backgroundColor="#FFDBB2"
          paddingHorizontal="10%"
        >
          <Progress
            value={Math.max(1, (step / NumSteps) * 100)}
            marginTop="2%"
            borderRadius={4}
          >
            <Progress.Indicator animation="quick" />
          </Progress>
          <YStack
            paddingTop="8%"
            justifyContent="center"
            height="100%"
            paddingBottom="20%"
            gap="$3"
          >
            <XStack flexGrow={0}>
              <Image
                source={require("../assets/images/icon.png")}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                }}
              />
            </XStack>
            <YStack gap="$3" flexGrow={1}>
              {renderStep()}
            </YStack>
            {/* {__DEV__ && (
              <StyledButton onPress={() => router.replace("/home")}>
                home
              </StyledButton>
            )} */}
          </YStack>
        </YStack>
      </KeyboardAwareScrollView>
    </Theme>
  );
}
