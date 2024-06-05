import * as WebBrowser from "expo-web-browser";
import { useContext, useState } from "react";
import { Image, SafeAreaView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { H2, Theme, XStack, YStack } from "tamagui";
import {
  SlidingScalePayment,
  StartingSlidingScaleValue,
  getSlidingPriceMoneyValue,
  getSlidingPricePaymentLink,
  recordContribution,
} from "../components/SlidingScalePayment";
import {
  ExternalLinkText,
  StyledButton,
  StyledText,
} from "../components/Themed";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ContributionsList } from "../components/ContributionsList";
import { ContributionsKey } from "../utils/asyncStorage";
import { useQueryClient } from "@tanstack/react-query";
import { UserContext } from "../utils/user";

export default function About() {
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const { currentUser } = useContext(UserContext);
  const onSlideStart = () => setScrollEnabled(false);
  const onSlideEnd = () => setScrollEnabled(true);
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  const paymentLink = getSlidingPricePaymentLink(value[0], currentUser);
  useFixExpoRouter3NavigationTitle();
  const queryClient = useQueryClient();

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
      </SafeAreaView>
    </Theme>
  );
}

export function AboutSection({
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
      </StyledText>
      <StyledText>
        Making{" "}
        <ExternalLinkText href="https://spencerchang.substack.com/p/ti-10-make-small-web-tools">
          handmade software
        </ExternalLinkText>{" "}
        is how I <StyledText bold>make my living</StyledText> as an indie
        engineer-artist, but I'm offering sliding scale payment to make my work
        accessible. Your contribution enables{" "}
        <StyledText bold>lifetime access</StyledText> and continued development.
      </StyledText>
      <StyledText>
        I appreciate your support and hope you enjoy Gather 🧡
      </StyledText>
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
