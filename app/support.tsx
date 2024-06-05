import { useContext, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  SlidingScalePayment,
  StartingSlidingScaleValue,
  getSlidingPriceMoneyValue,
  getSlidingPricePaymentLink,
  recordContribution,
} from "../components/SlidingScalePayment";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native";
import { H3, Theme, YStack } from "tamagui";
import { StyledButton, StyledText } from "../components/Themed";
import { ContributionsKey } from "../utils/asyncStorage";
import { ContributionsList } from "../components/ContributionsList";
import { UserContext } from "../utils/user";

export default function Support() {
  const [value, setValue] = useState([StartingSlidingScaleValue]);
  const { currentUser } = useContext(UserContext);
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
        <YStack
          backgroundColor="#FFDBB2"
          paddingTop="10%"
          paddingBottom="5%"
          paddingHorizontal="10%"
          gap="$3"
        >
          <H3>Contribution Box</H3>
          <StyledText>
            Your contribution helps me continue development of and maintain
            Gather. I hope you can contribute what you can to support your
            lifetime access of this app 🧡
          </StyledText>
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
      </SafeAreaView>
    </Theme>
  );
}
