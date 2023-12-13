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
import { useEmail } from "../utils/user";
import { ArenaChannelMultiSelect } from "../components/arena/ArenaChannelMultiSelect";
import { ArenaChannelSummary } from "../components/arena/ArenaChannelSummary";
import { ArenaChannelInfo } from "../utils/arena";

const NumSteps = 3;
// source https://uibakery.io/regex-library/email
const EmailRegex = /^\S+@\S+\.\S+$/;

export default function IntroScreen() {
  const [step, setStep] = useState<number>(0);
  const router = useRouter();
  const width = Dimensions.get("window").width;
  const [savedEmail, updateEmail] = useEmail();
  const [email, setEmail] = useState("");
  const { arenaAccessToken } = useContext(DatabaseContext);
  const [selectedChannels, setSelectedChannels] = useState<ArenaChannelInfo[]>(
    []
  );

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [savedEmail]);

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
        // welcome / what this is
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
              {/* TODO: turn into carousel? */}
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
            ></StyledInput>
            <StyledText metadata>
              This information will not be sent anywhere and is only used to
              create your personal unique identifier.
            </StyledText>
            {/* TODO: disable if email not right */}
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
            <YStack>
              <StyledText fontWeight="bold" fontSize="$5">
                Adding to Are.na
                <ArenaLogo
                  style={{
                    marginLeft: -4,
                  }}
                />
              </StyledText>
              <StyledText>
                The data you add on Gather is stored locally and will be synced
                to Are.na whenever you are online.
              </StyledText>
            </YStack>
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
              // TODO: multi-select arena channel component
              <>
                <ArenaChannelMultiSelect
                  setSelectedChannels={setSelectedChannels}
                  selectedChannels={selectedChannels}
                />
                <YStack space="$3">
                  {selectedChannels.map((channel) => (
                    <Stack backgroundColor="$green4">
                      <ArenaChannelSummary channel={channel} />
                    </Stack>
                  ))}
                </YStack>
              </>
            )}

            <NextStepButton
              text={
                selectedChannels.length > 1
                  ? `Import ${selectedChannels.length} channels`
                  : arenaAccessToken
                  ? "I'll import later"
                  : "Not now"
              }
            />
          </>
        );
      // arena prompt
      case 2:
        // collection examples
        return (
          <>
            <StyledText>
              Create a collection to start gathering. Some examples include: - a
              collection of things you want to remember - a people watching
              collection - a collection of times you said wow
            </StyledText>
            <NextStepButton text="Start gathering" />
          </>
        );
    }
  }

  return (
    <Theme name="light">
      <YStack
        minHeight="100%"
        backgroundColor="#FFDBB2"
        paddingHorizontal="10%"
      >
        <Progress
          value={((step + 1) / NumSteps) * 100}
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
            {__DEV__ && (
              <StyledButton onPress={() => router.replace("/home")}>
                home
              </StyledButton>
            )}
          </YStack>
        </YStack>
      </YStack>
    </Theme>
  );
}
