import { useRouter } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useContext, useEffect, useState } from "react";
import {
  SafeAreaView,
  Alert,
  Dimensions,
  Image,
  Platform,
  useColorScheme,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Carousel from "react-native-reanimated-carousel";
import {
  ButtonProps,
  Checkbox,
  H2,
  Progress,
  ScrollView,
  Spinner,
  Stack,
  Theme,
  XStack,
  YStack,
} from "tamagui";
import { RawAnimations } from "../animations";
import { BlockContent } from "../components/BlockContent";
import { InspoBlocks } from "../components/BlockTexts";
import {
  StartingSlidingScaleValue,
  getSlidingPriceMoneyValue,
  handlePayment,
} from "../components/SlidingScalePayment";
import {
  ArenaLogo,
  ExternalLinkText,
  Icon,
  IconType,
  StyledButton,
  StyledInput,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import { ArenaChannelMultiSelect } from "../components/arena/ArenaChannelMultiSelect";
import { ArenaChannelSummary } from "../components/arena/ArenaChannelSummary";
import {
  ArenaChannelInfo,
  getChannelThumb,
  rawArenaBlockToBlock,
} from "../utils/arena";
import { setBoolean, useStickyValue } from "../utils/mmkv";
import { DatabaseContext } from "../utils/db";
import { UserContext } from "../utils/user";
import { ArenaLogin } from "../views/ArenaLogin";
import { AboutSectionWithDonation, AboutSpencer } from "./about";
import { ErrorsContext } from "../utils/errors";
import { useQuery } from "@tanstack/react-query";
import { HelpGuideUrl } from "../utils/constants";
import { NetworkContext } from "../utils/network";
import { RapidCreateCollection } from "../components/RapidCreateCollection";

interface ExampleCollectionType {
  name: string;
  arenaChannelUrl?: string;
}

const ExampleCollections: ExampleCollectionType[] = [
  {
    name: "moments people made you smile",
    arenaChannelUrl:
      "https://www.are.na/spencer-chang/moments-people-made-you-smile-example",
  },
  {
    name: "glad i walked",
    arenaChannelUrl: "https://www.are.na/spencer-chang/glad-i-walked",
  },
  {
    name: "phrases",
    arenaChannelUrl:
      "https://www.are.na/spencer-chang/terms-words-provocations",
  },
  {
    name: "i've felt that",
    arenaChannelUrl:
      "https://www.are.na/julia-ernst-epcb2hzdr8c/i-ve-felt-that",
  },
  {
    name: "moved",
    arenaChannelUrl: "https://www.are.na/tay-lore/moved-kyyx5dshdj8",
  },
  {
    name: "times i said wow",
    arenaChannelUrl: "https://www.are.na/spencer-chang/wow-geoi3s6ev74",
  },
  {
    name: "what's in my bag",
    arenaChannelUrl: "https://www.are.na/laurel-schwulst/four-things-in-my-bag",
  },
  {
    name: "gratitude journal",
    arenaChannelUrl: "https://www.are.na/laura-houlberg/gratitude-journal",
  },
  {
    name: "orange things",
    arenaChannelUrl: "https://www.are.na/spencer-chang/orange-ffcsx6iwyk8",
  },
  {
    name: "outfits of the day",
    arenaChannelUrl: "https://www.are.na/spencer-chang/fits-example",
  },
];

const NumSteps = 4;
// source https://uibakery.io/regex-library/email
const EmailRegex = /^\S+@\S+\.\S+$/;

export default function IntroScreen() {
  const [step, setStep] = useState<number>(0);
  const router = useRouter();
  const { logError } = useContext(ErrorsContext);
  const { width, height: windowHeight } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const visibleScreenHeight = windowHeight - insets.top - insets.bottom;
  const {
    email: savedEmail,
    setupUser,
    currentUser,
    arenaAccessToken,
  } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const { tryImportArenaChannel } = useContext(DatabaseContext);
  const [selectedChannels, setSelectedChannels] = useState<ArenaChannelInfo[]>(
    []
  );
  const [checked, setChecked] = useStickyValue("subscribeEmail", false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const onSlideStart = () => setScrollEnabled(false);
  const onSlideEnd = () => setScrollEnabled(true);
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [savedEmail]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("#FFDBB2");
    }
    return () => {
      NavigationBar.setBackgroundColorAsync(
        colorScheme === "light" ? "white" : "black"
      );
    };
  }, []);

  async function maybeSubscribeEmail() {
    if (!checked) {
      return;
    }

    try {
      await fetch("https://coda.io/form/wglAPFKR8v/submit", {
        method: "POST",
        body: JSON.stringify({ row: { email } }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      logError(err);
    }
  }

  async function importSelectedChannels() {
    // TODO: this would ideally do it in the background asynchronously
    setIsLoading(true);
    try {
      await Promise.all(
        selectedChannels.map(
          async (channel) => await tryImportArenaChannel(channel.id.toString())
        )
      );
    } catch (error) {
      logError(error);
      // throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function nextStep() {
    if (step === NumSteps - 1) {
      void maybeSubscribeEmail();
      setBoolean("seenIntro", true);
      router.replace("/home");
    }
    setStep(step + 1);
  }

  function NextStepButton({
    text,
    onPress,
    ...rest
  }: {
    text: string | React.ReactNode;
    onPress?: () => void;
  } & Partial<ButtonProps>) {
    return (
      <StyledButton
        backgroundColor="$blue8"
        onPress={async () => {
          await onPress?.();
          nextStep();
        }}
        marginTop="auto"
        {...rest}
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
          // TODO: add animated.view to slide in?
          <>
            <XStack justifyContent="center">
              <Image
                source={require("../assets/images/icon.png")}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                }}
              />
            </XStack>
            <H2>Welcome to Gather</H2>
            <StyledText marginBottom="$1">
              Your messy space for gathering inspiration, encounters, and
              moments
            </StyledText>
            <YStack alignItems="center" marginBottom="$3">
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
              textContentType="emailAddress"
              returnKeyType="done"
            ></StyledInput>
            <XStack alignItems="center" gap="$1.5">
              <Checkbox
                checked={checked}
                onCheckedChange={(ch) => setChecked(Boolean(ch))}
              >
                <Checkbox.Indicator>
                  <Icon name="checkmark" />
                </Checkbox.Indicator>
              </Checkbox>
              <StyledText metadata>Send me updates</StyledText>
            </XStack>
            <StyledText metadata>
              Your email is only recorded if you check the box to send you
              updates.
            </StyledText>
            <StyledText metadata>
              This app has no tracking or ads. All your data stays on your
              device and is only synced to external sources with your choice.
            </StyledText>
            <NextStepButton
              text="Next"
              disabled={!email || !EmailRegex.test(email)}
              onPress={async () => {
                if (currentUser && currentUser?.id) {
                  return;
                }
                await setupUser({ email });
              }}
            />
          </>
        );
      case 1:
        return (
          <>
            <StyledText size="$6" bold>
              Gathering Practices
            </StyledText>
            <StyledText size="$4">
              Create collections to start gathering. Treat them as ideas you
              want to revisit, things you want to pay attention to, or rituals
              you want to cultivate.
            </StyledText>
            <StyledText size="$4">
              You'll connect blocks (text, images, videos, links, etc.) of the
              things you encounter in your life to these collections to build a
              personal archive.
            </StyledText>
            <StyledText size="$4">
              Check out our{" "}
              <ExternalLinkText href={HelpGuideUrl}>guide</ExternalLinkText> for
              more inspiration.
            </StyledText>
            <YStack gap="$3">
              {/* TODO: change these to collapsible lists and show the examples of things, maybe just take 3 or so for each */}
              {ExampleCollections.map((collection, idx) => (
                <ExampleCollection key={idx} {...collection} />
              ))}
              <StyledParagraph>
                Have other collections that come to mind now? Here's your chance
                to make them! :)
              </StyledParagraph>
              <RapidCreateCollection />
            </YStack>
            <NextStepButton text="I think I get it" marginTop="$2" />
          </>
        );
      case 2:
        return (
          <>
            <StyledText size="$6" bold>
              Adding to Are.na <ArenaLogo />
            </StyledText>
            <StyledText>
              Gather stores your data locally on your device. You can optionally
              sync specific collections to Are.na. For shared Are.na channels,
              you'll be able to "chat" with them in Gather.
            </StyledText>
            <StyledText>
              Please ensure you have a stable network connection before
              importing! You can always do so later in your profile.
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
                  : selectedChannels.length >= 1
                  ? `Import ${selectedChannels.length} channels`
                  : arenaAccessToken
                  ? "I'll import later"
                  : "Not now"
              }
              onPress={importSelectedChannels}
              disabled={isLoading}
            />
          </>
        );
      case 3:
        return Platform.OS === "ios" ? (
          <>
            <AboutSpencer shortened />

            <YStack gap="$2" marginTop="auto">
              <NextStepButton
                text={<StyledText>Ok, I'm ready to try</StyledText>}
              />
            </YStack>
          </>
        ) : (
          <>
            <AboutSectionWithDonation
              value={value}
              setValue={setValue}
              onSlideStart={onSlideStart}
              onSlideEnd={onSlideEnd}
            />
            <YStack gap="$2" marginTop="auto">
              <NextStepButton
                text={
                  <StyledText>
                    Contribute <StyledText bold>${moneyValue}</StyledText>
                  </StyledText>
                }
                onPress={async () => {
                  await handlePayment(value[0], currentUser);
                }}
                marginBottom={0}
              />
              <StyledText
                metadata
                fontSize="$small"
                textAlign="center"
                onPress={() => {
                  Alert.alert(
                    "pretty please?",
                    "This work, like all handmade software, only happens because of people like you contributing a few dollars. Together, we can make it possible to create software with data that's entirely yours and not subject to ads or adverse incentives.",
                    [
                      {
                        text: "Sorry I really can't",
                        onPress: () => {
                          Alert.alert(
                            "That's okay",
                            "I hope you enjoy Gather and find it useful. If you change your mind, you can always contribute later in the profile tab.",
                            [
                              {
                                text: "Thanks! I'll contribute later if I like it",
                              },
                            ],
                            { cancelable: true }
                          );
                          nextStep();
                        },
                        style: "default",
                      },
                      {
                        text: "Ok you've convinced me",
                        onPress: () => {},
                        style: "cancel",
                      },
                    ]
                  );
                }}
              >
                I'm sorry I can't support you right now
              </StyledText>
            </YStack>
          </>
        );
    }
  }

  return (
    <Theme name="light">
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#FFDBB2",
        }}
      >
        <KeyboardAwareScrollView
          style={{ flex: 1, height: visibleScreenHeight }}
          extraScrollHeight={70}
          scrollEnabled={scrollEnabled}
        >
          <YStack
            backgroundColor="#FFDBB2"
            paddingHorizontal="10%"
            height="100%"
            minHeight={visibleScreenHeight}
          >
            <Progress
              theme="blue"
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
                {step > 0 && (
                  <StyledButton
                    theme="gray"
                    size="$small"
                    left={0}
                    onPress={() => {
                      setStep((stp) => stp - 1);
                    }}
                    icon={
                      <Icon
                        name="chevron-left"
                        size={8}
                        type={IconType.FontAwesomeIcon}
                      />
                    }
                  >
                    Back
                  </StyledButton>
                )}
              </XStack>
              <YStack gap="$3" flexGrow={1}>
                {renderStep()}
              </YStack>
            </YStack>
          </YStack>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Theme>
  );
}

function ExampleCollection({ name, arenaChannelUrl }: ExampleCollectionType) {
  const { isConnected } = useContext(NetworkContext);
  const { createCollection } = useContext(DatabaseContext);
  const { currentUser } = useContext(UserContext);
  const [isCreated, setIsCreated] = useState(false);
  const { data: items } = useQuery({
    queryKey: [arenaChannelUrl],
    queryFn: async () => {
      if (!arenaChannelUrl) {
        return [];
      }
      const items = await getChannelThumb(arenaChannelUrl);
      return items.map(rawArenaBlockToBlock).slice(0, 5);
    },
  });

  const handleCreateCollection = async () => {
    try {
      await createCollection({
        title: name,
        createdBy: currentUser?.id || "Gather",
      });
      setIsCreated(true);
    } catch (error) {
      console.error("Failed to create collection:", error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <YStack gap="$1.5">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$2"
        width="100%"
      >
        {arenaChannelUrl ? (
          <ExternalLinkText href={arenaChannelUrl}>
            <StyledText size="$4" bold link>
              {name}
            </StyledText>
          </ExternalLinkText>
        ) : (
          <StyledText size="$4" bold>
            {name}
          </StyledText>
        )}
        <StyledButton
          size="$small"
          alignSelf="flex-end"
          onPress={handleCreateCollection}
          disabled={isCreated}
          backgroundColor={isCreated ? "$green6" : undefined}
          opacity={isCreated ? 0.8 : undefined}
          icon={
            <Icon
              name={isCreated ? "check" : "plus"}
              type={IconType.FontAwesomeIcon}
            />
          }
        >
          {isCreated ? "Added" : "Add"}
        </StyledButton>
      </XStack>
      {isConnected && Boolean(items?.length) ? (
        <ScrollView horizontal flex={1}>
          <XStack gap="$2" height={140}>
            {items?.map((item, idx) => (
              <YStack height={140} maxWidth={140} key={item.id}>
                <BlockContent
                  key={idx}
                  {...item}
                  mediaStyle={{
                    maxHeight: 140,
                    maxWidth: 140,
                  }}
                  containerStyle={{
                    maxHeight: 140,
                    height: "100%",
                  }}
                  textContainerProps={{
                    padding: 2,
                    width: 140,
                  }}
                  textProps={{
                    fontSize: "$1",
                  }}
                />
              </YStack>
            ))}
          </XStack>
        </ScrollView>
      ) : null}
    </YStack>
  );
}
