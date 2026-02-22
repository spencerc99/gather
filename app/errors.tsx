import { Alert, SafeAreaView } from "react-native";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ScrollView, XStack, YStack } from "tamagui";
import { getErrors } from "../utils/errors";
import {
  StyledButton,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import * as Clipboard from "expo-clipboard";

export default function Dev() {
  useFixExpoRouter3NavigationTitle();
  const errors = getErrors();

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied to clipboard");
  };

  const copyAll = async () => {
    if (!errors?.length) return;
    const text = errors
      .map(
        (e) =>
          `[${new Date(e.time).toLocaleString()}]${
            e.pathname ? ` (${e.pathname})` : ""
          } ${e.error}`
      )
      .join("\n\n");
    await copyToClipboard(text);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <ScrollView>
        <YStack paddingHorizontal="5%" paddingTop="5%" gap="$1.5">
          <XStack justifyContent="space-between" alignItems="center">
            <StyledText bold>
              Error Log ({errors?.length ?? 0})
            </StyledText>
            {errors && errors.length > 0 && (
              <StyledButton size="$2" onPress={copyAll}>
                Copy All
              </StyledButton>
            )}
          </XStack>
          {errors?.map((error, idx) => (
            <YStack
              key={idx}
              gap="$1"
              padding="$2"
              borderRadius="$2"
              backgroundColor="$background"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => copyToClipboard(error.error)}
            >
              <StyledText metadata>
                {new Date(error.time).toLocaleDateString()}{" "}
                {new Date(error.time).toLocaleTimeString()}
                {error.pathname ? (
                  <StyledText> - {error.pathname}</StyledText>
                ) : null}
              </StyledText>
              <StyledParagraph
                color="$red10"
                userSelect="auto"
              >
                {error.error}
              </StyledParagraph>
              <StyledText metadata color="$gray8">
                Tap to copy
              </StyledText>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
