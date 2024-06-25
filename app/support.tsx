import { useContext, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SlidingScalePayment,
  StartingSlidingScaleValue,
  getSlidingPriceMoneyValue,
  getSlidingPricePaymentLink,
  recordContribution,
} from "../components/SlidingScalePayment";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { useQueryClient } from "@tanstack/react-query";
import { H3, Theme, YStack } from "tamagui";
import { StyledButton, StyledText, StyledView } from "../components/Themed";
import { ContributionsKey } from "../utils/asyncStorage";
import { ContributionsList } from "../components/ContributionsList";
import { UserContext } from "../utils/user";
import { UsageInfo } from "../components/UsageInfo";

export default function Support() {
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const { currentUser } = useContext(UserContext);
  const moneyValue = getSlidingPriceMoneyValue(value[0]);
  const paymentLink = getSlidingPricePaymentLink(value[0], currentUser);
  useFixExpoRouter3NavigationTitle();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  return (
    <Theme name="light">
      <StyledView
        flex={1}
        backgroundColor={"#FFDBB2"}
        paddingBottom={insets.bottom}
        paddingTop={insets.top}
      >
        <YStack
          backgroundColor="#FFDBB2"
          paddingTop={"10%"}
          paddingBottom="5%"
          paddingHorizontal="10%"
          gap="$3"
        >
          <H3>Contribution Box</H3>
          <StyledText>
            Gather doesn't have ads or require a subscription, so your
            contribution gives you <StyledText bold>lifetime access</StyledText>{" "}
            and supports continued development. Thank you for contributing what
            you can to support my work 🧡
          </StyledText>
          <UsageInfo />
          <ContributionsList />
          <SlidingScalePayment val={value} setVal={setValue} />
          <YStack marginTop="$10">
            <StyledButton
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
      </StyledView>
    </Theme>
  );
}
