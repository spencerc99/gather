import { H1, ScrollView, YStack } from "tamagui";
import * as Application from "expo-application";
import {
  Icon,
  LinkButton,
  StyledButton,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import { StatusBar } from "expo-status-bar";
import { Platform, Image, Linking } from "react-native";

export default function Feedback() {
  return (
    <ScrollView padding="10%" space="$4">
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </ScrollView>
  );
}
