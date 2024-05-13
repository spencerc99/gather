import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useContext, useEffect, useState } from "react";
import { Alert, Dimensions, Image, SafeAreaView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Carousel from "react-native-reanimated-carousel";
import {
  ButtonProps,
  Checkbox,
  H2,
  Progress,
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
  getSlidingPricePaymentLink,
  recordContribution,
} from "../components/SlidingScalePayment";
import {
  ArenaLogo,
  ExternalLinkText,
  Icon,
  IconType,
  StyledButton,
  StyledInput,
  StyledText,
} from "../components/Themed";
import { ArenaChannelMultiSelect } from "../components/arena/ArenaChannelMultiSelect";
import { ArenaChannelSummary } from "../components/arena/ArenaChannelSummary";
import { ArenaChannelInfo } from "../utils/arena";
import { setBoolean, useStickyValue } from "../utils/asyncStorage";
import { DatabaseContext } from "../utils/db";
import { UserContext } from "../utils/user";
import { ArenaLogin } from "../views/ArenaLogin";
import { AboutSection } from "./about";

const NumSteps = 4;
// source https://uibakery.io/regex-library/email
const EmailRegex = /^\S+@\S+\.\S+$/;

export default function IntroScreen() {
  const [step, setStep] = useState<number>(0);
  const router = useRouter();
  const width = Dimensions.get("window").width;
  const { email: savedEmail, setupUser, currentUser } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const { arenaAccessToken, tryImportArenaChannel } =
    useContext(DatabaseContext);
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
  const paymentLink = getSlidingPricePaymentLink(value[0]);

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [savedEmail]);

  async function maybeSubscribeEmail() {
    if (!checked) {
      return;
    }

    try {
      // TODO: add email subscription
    } catch (err) {
      console.error(err);
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
      console.error(error);
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
              moments (no Internet required!)
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
              Your email is only recorded to send you updates if you check the
              box.
            </StyledText>
            <NextStepButton
              text="Next"
              disabled={!email || !EmailRegex.test(email)}
              onPress={async () => {
                if (currentUser) {
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
            <AboutSection
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
                  await WebBrowser.openBrowserAsync(paymentLink);
                  recordContribution(moneyValue);
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
                            "It's okay",
                            "I hope you enjoy the app regardless and that you'll find a way to contribute later if you find it useful!",
                            []
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
      case 2:
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
                -{" "}
                <ExternalLinkText href="https://www.are.na/spencer-chang/i-want-to-remember-this-fih_jry0poi">
                  things you want to remember
                </ExternalLinkText>
              </StyledText>
              <StyledText fontSize="$4">- times you love life</StyledText>
              <StyledText fontSize="$4">
                - descriptions of people you watch
              </StyledText>
              <StyledText fontSize="$4">
                - times{" "}
                <ExternalLinkText href="https://www.are.na/channel/wow-geoi3s6ev74">
                  you said wow
                </ExternalLinkText>
              </StyledText>
              <StyledText fontSize="$4">- orange things</StyledText>
              <StyledText fontSize="$4">
                - nice things people say about you
              </StyledText>
              <StyledText fontSize="$4">
                - nice things you say about other people
              </StyledText>
              <StyledText fontSize="$4">- songs that slap</StyledText>
              <StyledText fontSize="$4">
                -{" "}
                <ExternalLinkText href="https://www.spencerchang.me/fits">
                  outfits of the day
                </ExternalLinkText>
              </StyledText>
              <StyledText fontSize="$4">- morning mood log</StyledText>
            </YStack>
            <NextStepButton text="Start gathering" />
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
          style={{ flex: 1 }}
          extraScrollHeight={70}
          scrollEnabled={scrollEnabled}
        >
          <YStack
            minHeight="100%"
            backgroundColor="#FFDBB2"
            paddingHorizontal="10%"
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
                    theme="grey"
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
              {/* {__DEV__ && (
              <StyledButton onPress={() => router.replace("/home")}>
                home
              </StyledButton>
            )} */}
            </YStack>
          </YStack>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Theme>
  );
}
