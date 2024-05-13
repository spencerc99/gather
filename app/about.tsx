import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Image, SafeAreaView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { H2, XStack, YStack } from "tamagui";
import { ExternalLink } from "../components/ExternalLink";
import {
  SlidingScalePayment,
  StartingSlidingScaleValue,
  getSlidingPriceMoneyValue,
  getSlidingPricePaymentLink,
  recordContribution,
} from "../components/SlidingScalePayment";
import { StyledButton, StyledText } from "../components/Themed";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ContributionsList } from "../components/ContributionsList";
import { ContributionsKey } from "../utils/asyncStorage";
import { useQueryClient } from "@tanstack/react-query";

export default function About() {
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const onSlideStart = () => setScrollEnabled(false);
  const onSlideEnd = () => setScrollEnabled(true);
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  const paymentLink = getSlidingPricePaymentLink(value[0]);
  useFixExpoRouter3NavigationTitle();
  const queryClient = useQueryClient();

  return (
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
          paddingTop="5%"
          paddingBottom="5%"
          paddingHorizontal="10%"
          gap="$3"
        >
          <AboutSection
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
                await WebBrowser.openBrowserAsync(paymentLink);
                recordContribution(moneyValue);
                queryClient.invalidateQueries({ queryKey: [ContributionsKey] });
              }}
            >
              Contribute <StyledText bold>${moneyValue}</StyledText>
            </StyledButton>
          </YStack>
        </YStack>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export function AboutSection({
  value,
  setValue,
  onSlideStart,
  onSlideEnd,
}: {
  value: number[];
  setValue: (value: number[]) => void;
  onSlideStart: () => void;
  onSlideEnd: () => void;
}) {
  return (
    <>
      <XStack>
        <H2>Hi, I'm Spencer</H2>
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
        <ExternalLink href="https://gather.directory">
          <StyledText link>Gather</StyledText>
        </ExternalLink>{" "}
        because I wanted a fast, simple way to archive & curate multimedia
        collections. After learning to make a mobile app (with help from friends
        at{" "}
        <ExternalLink href="https://canvas.xyz">
          <StyledText link>canvas.xyz</StyledText>
        </ExternalLink>{" "}
        &{" "}
        <ExternalLink href="https://are.na">
          <StyledText link>are.na</StyledText>
        </ExternalLink>
        ), it has become an expression of how I wish to interact with my data.
      </StyledText>
      <StyledText>
        I want my work to be as accessible as possible, AND making this{" "}
        <ExternalLink href="https://spencerchang.substack.com/p/ti-10-make-small-web-tools">
          <StyledText link>handmade software</StyledText>
        </ExternalLink>{" "}
        is how I <StyledText bold>make my living</StyledText> as an indie
        engineer-artist. I really appreciate anything you can offer to support
        me in exchange for <StyledText bold>lifetime access</StyledText> to this
        app 🧡
      </StyledText>
      <ContributionsList />
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
