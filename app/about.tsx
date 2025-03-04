import { useContext, useState } from "react";
import { Image, Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { H2, Theme, XStack, YStack } from "tamagui";
import {
  SlidingScalePayment,
  StartingSlidingScaleValue,
  getSlidingPriceMoneyValue,
  handlePayment,
} from "../components/SlidingScalePayment";
import {
  ExternalLinkText,
  StyledButton,
  StyledDefaultText,
  StyledText,
  StyledView,
} from "../components/Themed";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ContributionsList } from "../components/ContributionsList";
import { ContributionsKey } from "../utils/mmkv";
import { useQueryClient } from "@tanstack/react-query";
import { UserContext } from "../utils/user";
import { UsageInfo } from "../components/UsageInfo";
import { ArenaInterviewUrl } from "../utils/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExternalLink } from "../components/ExternalLink";

export default function About() {
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const { currentUser } = useContext(UserContext);
  const onSlideStart = () => setScrollEnabled(false);
  const onSlideEnd = () => setScrollEnabled(true);
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  useFixExpoRouter3NavigationTitle();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  return (
    <Theme name="light">
      <StyledView
        flex={1}
        paddingTop={Platform.OS === "ios" ? "20%" : insets.top + 30}
        paddingBottom={insets.bottom}
        backgroundColor="#FFDBB2"
      >
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          extraScrollHeight={70}
          scrollEnabled={scrollEnabled}
        >
          <YStack
            minHeight="100%"
            paddingTop="5%"
            paddingBottom="5%"
            paddingHorizontal="10%"
            gap="$3"
          >
            <AboutSectionWithDonation
              value={value}
              setValue={setValue}
              onSlideStart={onSlideStart}
              onSlideEnd={onSlideEnd}
            />
            <YStack marginTop="auto">
              <StyledButton
                marginTop="$7"
                backgroundColor="$blue8"
                onPress={async () => {
                  await handlePayment(value[0], currentUser);
                  queryClient.invalidateQueries({
                    queryKey: [ContributionsKey],
                  });
                }}
              >
                <StyledText>
                  Contribute <StyledText bold>${moneyValue}</StyledText>
                </StyledText>
              </StyledButton>
            </YStack>
          </YStack>
        </KeyboardAwareScrollView>
      </StyledView>
    </Theme>
  );
}

export function AboutSectionWithDonation({
  value,
  setValue,
  onSlideStart,
  onSlideEnd,
  shortened,
}: {
  value: number[];
  setValue: (value: number[]) => void;
  onSlideStart: () => void;
  onSlideEnd: () => void;
  shortened?: boolean;
}) {
  return (
    <>
      <AboutSpencer shortened={shortened} />
      {!shortened && <UsageInfo />}
      {!shortened && <ContributionsList />}
      <YStack marginTop="$2">
        <SlidingScalePayment
          val={value}
          setVal={setValue}
          onSlideStart={onSlideStart}
          onSlideEnd={onSlideEnd}
        ></SlidingScalePayment>
      </YStack>
    </>
  );
}

export function AboutSpencer({ shortened }: { shortened?: boolean }) {
  return (
    <>
      <XStack>
        <H2>
          Hi, I'm{" "}
          <ExternalLink href="https://spencer.place">
            <StyledDefaultText bold link>
              Spencer
            </StyledDefaultText>
          </ExternalLink>
        </H2>
        <Image
          source={require("../assets/images/spencer-happy-taiwan.png")}
          style={{
            maxWidth: 130,
            maxHeight: 150,
            borderRadius: 4,
            objectFit: "contain",
          }}
        />
      </XStack>
      <StyledText>
        I started making{" "}
        <ExternalLinkText href="https://gather.directory">
          Gather
        </ExternalLinkText>{" "}
        because I wanted a fast, simple way to archive & curate multimedia
        collections. After learning to make a mobile app
        {!shortened && (
          <StyledText>
            {" "}
            (with help from friends at{" "}
            <ExternalLinkText href="https://canvas.xyz">
              canvas.xyz
            </ExternalLinkText>{" "}
            & <ExternalLinkText href="https://are.na">are.na</ExternalLinkText>)
          </StyledText>
        )}
        , it has become an expression of how I wish to interact with my data.
        {!shortened && (
          <StyledText>
            {" "}
            You can learn more about the origins in{" "}
            <ExternalLinkText href={ArenaInterviewUrl}>
              my interview with Are.na
            </ExternalLinkText>
            .
          </StyledText>
        )}
      </StyledText>
      <StyledText>
        Making{" "}
        <ExternalLinkText href="https://spencerchang.substack.com/p/ti-10-make-small-web-tools">
          handmade software
        </ExternalLinkText>{" "}
        like this is what I <StyledText bold>do for a living</StyledText> as an
        indie engineer-artist. Gather is free without ads or a subscription, but
        you can support my creative practice by sharing it with your friends or
        giving a small contribution for the warm and fuzzy feeling of supporting
        an independent creative.
      </StyledText>
      <StyledText>
        I appreciate your support and hope you enjoy Gather 🧡
      </StyledText>
    </>
  );
}
