// ABOUTME: Hosts Gather's internal diagnostics and opt-in native database test.
// ABOUTME: Keeps recovery and developer-only verification tools on one route.
import { SafeAreaView } from "react-native";
import { InternalDevTools } from "../views/InternalDevTools";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { ScrollView, SizableText, YStack } from "tamagui";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { runNativeDatabaseTests } from "../utils/dbNativeTest";
import {
  getArenaBackgroundStatus,
  registerArenaBackgroundPullAsync,
  triggerArenaBackgroundPullForTestingAsync,
} from "../utils/background";

export default function Dev() {
  useFixExpoRouter3NavigationTitle();
  const { sqliteTest, backgroundTest } = useLocalSearchParams<{
    sqliteTest?: string;
    backgroundTest?: string;
  }>();
  const [databaseTestStatus, setDatabaseTestStatus] = useState<string | null>(
    null,
  );
  const [backgroundTestStatus, setBackgroundTestStatus] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    if (backgroundTest !== "1") {
      return;
    }
    const startedAt = Date.now();
    setBackgroundTestStatus("RUNNING");
    void registerArenaBackgroundPullAsync()
      .then(async (available) => {
        if (!available) {
          throw new Error("Background tasks are restricted on this device");
        }
        const triggered = await triggerArenaBackgroundPullForTestingAsync();
        if (!triggered) {
          throw new Error("The native background task worker did not start");
        }
        const status = await waitForBackgroundStatus(startedAt);
        const result = status.result;
        setBackgroundTestStatus(
          result
            ? `PASS: ${result.status}, ${result.itemsAdded} items, ${result.requests} requests`
            : `FAIL: ${status.error}`,
        );
      })
      .catch((error) => {
        setBackgroundTestStatus(`FAIL: ${String(error)}`);
      });
  }, [backgroundTest]);

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
          {backgroundTestStatus && (
            <SizableText testID="background-test-status">
              {backgroundTestStatus}
            </SizableText>
          )}
          <InternalDevTools />
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

async function waitForBackgroundStatus(startedAfter: number) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = getArenaBackgroundStatus();
    if (status && new Date(status.startedAt).getTime() >= startedAfter) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for background task diagnostics");
}
