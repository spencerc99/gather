import { SafeAreaView } from "react-native";
import { InternalDevTools } from "../views/InternalDevTools";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ScrollView, XStack, YStack } from "tamagui";
import { getErrors } from "../utils/errors";
import { StyledParagraph, StyledText } from "../components/Themed";

export default function Dev() {
  useFixExpoRouter3NavigationTitle();
  const errors = getErrors();

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <ScrollView>
        <YStack paddingHorizontal="10%" paddingTop="10%" gap="$1.5">
          {errors?.map((error, idx) => (
            <YStack key={idx} gap="">
              <StyledText metadata>
                {new Date(error.time).toLocaleDateString()}{" "}
                {new Date(error.time).toLocaleTimeString()}
                {error.pathname ? (
                  <StyledText> - {error.pathname}</StyledText>
                ) : null}
              </StyledText>
              <StyledParagraph color="$red10">{error.error}</StyledParagraph>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
