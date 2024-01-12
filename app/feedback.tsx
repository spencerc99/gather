import { H1, ScrollView, YStack } from "tamagui";
import { StyledParagraph, StyledText } from "../components/Themed";
import { ExternalLink } from "../components/ExternalLink";
import { StatusBar } from "expo-status-bar";
import { Platform, Image } from "react-native";

export default function Feedback() {
  return (
    <ScrollView padding="10%" space="$4">
      <H1>Feedback</H1>
      <StyledParagraph>Please send me feedback!</StyledParagraph>
      <StyledParagraph>
        You can text me if you have my number, email me at{" "}
        <StyledText color="$blue9">
          <ExternalLink href="mailto:spencerc99@gmail.com">
            spencerc99@gmail.com
          </ExternalLink>
        </StyledText>
        , or discord me @spencerc99
      </StyledParagraph>
      <StyledParagraph>
        Thank you for giving your space and time to try this app.
      </StyledParagraph>
      <YStack alignItems="center">
        <Image
          source={require("../assets/images/icon.png")}
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
          }}
        />
      </YStack>
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </ScrollView>
  );
}
