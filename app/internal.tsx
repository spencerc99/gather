import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { H2, View } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { StyledButton, StyledParagraph } from "../components/Themed";
import { useContext } from "react";

export default function ModalScreen() {
  const { db, initDatabases } = useContext(DatabaseContext);

  return (
    <View padding="10%" space="$2">
      <H2>Internal Developer Settings</H2>
      <StyledParagraph>
        You might want to reset your database to get the new schemas (sorry no
        migrations lol).
      </StyledParagraph>
      <StyledButton
        theme="red"
        backgroundColor="$red8"
        onPress={async () => {
          const results = await db.execAsync(
            [
              { sql: `DROP TABLE IF EXISTS collections;`, args: [] },
              { sql: `DROP TABLE IF EXISTS blocks;`, args: [] },
              { sql: `DROP TABLE IF EXISTS connections;`, args: [] },
            ],
            false
          );

          results
            .filter((result) => "error" in result)
            .forEach((result) => {
              throw result;
            });

          await initDatabases();
        }}
      >
        Reset Databases
      </StyledButton>
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}
