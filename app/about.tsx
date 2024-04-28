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
} from "../components/SlidingScalePayment";
import { StyledButton, StyledText } from "../components/Themed";

export default function About() {
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const onSlideStart = () => setScrollEnabled(false);
  const onSlideEnd = () => setScrollEnabled(true);
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  const paymentLink = getSlidingPricePaymentLink(value[0]);
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
          paddingHorizontal="10%"
        >
          <AboutSection
            value={value}
            setValue={setValue}
            onSlideStart={onSlideStart}
            onSlideEnd={onSlideEnd}
          />
          <StyledButton
            backgroundColor="$blue8"
            onPress={async () => {
              await WebBrowser.openBrowserAsync(paymentLink);
            }}
          >
            Contribute <StyledText bold>${moneyValue}</StyledText>
          </StyledButton>
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
      <H2>Hi, I'm Spencer</H2>
      <XStack justifyContent="center">
        <Image
          source={require("../assets/images/spencer-happy-taiwan.png")}
          style={{
            maxWidth: 250,
            maxHeight: 250,
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
        because I wanted a fast and easy way to archive and curate collections
        of data from my phone. It emerged after several months of prototyping
        with the support of some friends at{" "}
        <ExternalLink href="https://canvas.xyz">
          <StyledText link>canvas.xyz</StyledText>
        </ExternalLink>{" "}
        and{" "}
        <ExternalLink href="https://are.na">
          <StyledText link>are.na</StyledText>
        </ExternalLink>
        , and it expresses my very personal way of working with data.
      </StyledText>
      <StyledText>
        I want my work to be as accessible as possible, but making{" "}
        <ExternalLink href="https://spencerchang.substack.com/p/ti-10-make-small-web-tools">
          <StyledText link>handmade software</StyledText>
        </ExternalLink>{" "}
        like this is how I make my living as an in(ter)dependent engineer and
        artist. Thanks for trying Gather and appreciate anything you can offer
        to support!
      </StyledText>
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
