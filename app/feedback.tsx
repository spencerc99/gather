import { H3, Spinner, XStack, YStack } from "tamagui";
import * as Application from "expo-application";
import {
  StyledButton,
  StyledText,
  StyledTextArea,
  StyledView,
} from "../components/Themed";
import { useContext, useState } from "react";
import { UserContext } from "../utils/user";
import { useMutation } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

const Body = `I wish|like|want|dislike...`;

export default function Feedback() {
  const [feedback, setFeedback] = useState("");
  const { currentUser } = useContext(UserContext);
  const sendFeedbackMutation = useMutation({
    mutationFn: async () => {
      await fetch("https://coda.io/form/Z66kdxh0_y/submit", {
        method: "POST",
        body: JSON.stringify({
          row: {
            email: currentUser?.email,
            feedback,
            platform: Platform.OS,
            version: `${Application.nativeApplicationVersion} (
            ${Application.nativeBuildVersion})`,
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      setFeedback("");
      // TODO: toast with thank you for feedback
    },
  });
  const insets = useSafeAreaInsets();

  // TODO: select set of gather channels to import, if connected to are.na, otherwise send to form.
  // store if imported in mmkv
  return (
    <StyledView flex={1} paddingBottom={insets.bottom} paddingTop={insets.top}>
      <KeyboardAvoidingView
        contentContainerStyle={{
          flex: 1,
        }}
      >
        <YStack
          paddingHorizontal="10%"
          gap="$3"
          paddingTop={Platform.OS === "android" ? "10%" : 0}
        >
          <H3>Suggestion Box</H3>
          <StyledText>
            Send me your wishes, desires, harshest critiques, and sweetest
            compliments. I accept them all and will read them all (eventually).
          </StyledText>
          <XStack position="relative">
            <StyledTextArea
              value={feedback}
              onChangeText={setFeedback}
              placeholder={Body}
              minHeight={200}
              paddingBottom="$8"
            ></StyledTextArea>
            <StyledButton
              alignSelf="flex-end"
              theme="green"
              position="absolute"
              bottom="$2"
              right="$1.5"
              size="$medium"
              onPress={async () => sendFeedbackMutation.mutateAsync()}
              disabled={sendFeedbackMutation.isPending || feedback === ""}
              icon={
                sendFeedbackMutation.isPending ? (
                  <Spinner size="small" />
                ) : undefined
              }
            >
              Send
            </StyledButton>
          </XStack>
        </YStack>
      </KeyboardAvoidingView>
    </StyledView>
  );
}
