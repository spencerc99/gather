// ABOUTME: Hosts Gather's internal diagnostics and opt-in native database test.
// ABOUTME: Keeps recovery and developer-only verification tools on one route.
import { SafeAreaView } from "react-native";
import { InternalDevTools } from "../views/InternalDevTools";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ScrollView, SizableText, YStack } from "tamagui";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { runNativeDatabaseTests } from "../utils/dbNativeTest";

export default function Dev() {
  useFixExpoRouter3NavigationTitle();
  const { sqliteTest } = useLocalSearchParams<{ sqliteTest?: string }>();
  const [databaseTestStatus, setDatabaseTestStatus] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (sqliteTest !== "1") {
      return;
    }
    setDatabaseTestStatus("RUNNING");
    void runNativeDatabaseTests()
      .then((tests) => {
        const status = `PASS: ${tests.join(", ")}`;
        console.log(`[SQLite Native Test] ${status}`);
        setDatabaseTestStatus(status);
      })
      .catch((error) => {
        const status = `FAIL: ${String(error)}`;
        console.error(`[SQLite Native Test] ${status}`);
        setDatabaseTestStatus(status);
      });
  }, [sqliteTest]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <ScrollView>
        <YStack paddingHorizontal="8%" paddingTop="5%">
          {databaseTestStatus && (
            <SizableText testID="sqlite-test-status">
              {databaseTestStatus}
            </SizableText>
          )}
          <InternalDevTools />
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
