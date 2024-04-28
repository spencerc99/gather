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
      <XStack>
        <H2 flexWrap="wrap">Hi, I'm Spencer</H2>
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
        collections. After several months of engineering (with help from friends{" "}
        <ExternalLink href="https://canvas.xyz">
          <StyledText link>canvas.xyz</StyledText>
        </ExternalLink>{" "}
        &{" "}
        <ExternalLink href="https://are.na">
          <StyledText link>are.na</StyledText>
        </ExternalLink>
        ), it has become a personal expression of how I want to interact with
        the data I collect.
      </StyledText>
      <StyledText>
        I want my work to be as accessible as possible, AND making{" "}
        <ExternalLink href="https://spencerchang.substack.com/p/ti-10-make-small-web-tools">
          <StyledText link>handmade software</StyledText>
        </ExternalLink>{" "}
        like this is how I make my living as an indie engineer-artist. Thanks
        you for anything you can offer to support my work!
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
