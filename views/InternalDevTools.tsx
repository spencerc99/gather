import { YStack, H3, XStack, Spinner } from "tamagui";
import {
  StyledButton,
  Icon,
  StyledText,
  StyledParagraph,
  StyledLabel,
} from "../components/Themed";
import { setBoolean, removeItem, LastSyncedAtKey } from "../utils/asyncStorage";
import { UserInfoId } from "../utils/user";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { storage } from "../utils/mmkv";

export function InternalDevTools({
  isLoading,
  setIsLoading,
}: {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}) {
  const {
    db,
    fetchBlocks,
    fetchCollections,
    trySyncPendingArenaBlocks,
    trySyncNewArenaBlocks,
    getPendingArenaBlocks,
    arenaAccessToken,
    tryImportArenaChannel,
  } = useContext(DatabaseContext);
  const [showInternalTools, setShowInternalTools] = useState(false);
  const [pendingArenaBlocks, setPendingArenaBlocks] = useState<any>([]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    getPendingArenaBlocks().then((result) =>
      setPendingArenaBlocks(result.rows)
    );
  }, []);

  return (
    <YStack gap="$2">
      <H3>
        Internal Dev Tools{" "}
        <StyledButton
          onPress={() => setShowInternalTools(!showInternalTools)}
          circular
          size="$5"
          theme="white"
          backgroundColor="$gray6"
          icon={
            <Icon name={showInternalTools ? "chevron-up" : "chevron-down"} />
          }
        ></StyledButton>
      </H3>
      {showInternalTools && (
        <YStack space="$2">
          <StyledText>
            These are available for testing and debugging purposes. If you run
            into any issues, please contact Spencer first, and he might direct
            you to these buttons if there are issues :)
          </StyledText>
          <StyledButton
            disabled={isLoading}
            onPress={async () => {
              setIsLoading(true);
              try {
                await trySyncPendingArenaBlocks();
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <StyledParagraph>
              Sync to Arena ({pendingArenaBlocks.length} pending)
            </StyledParagraph>
          </StyledButton>
          <StyledButton
            disabled={isLoading}
            onPress={async () => {
              setIsLoading(true);
              try {
                await trySyncNewArenaBlocks();
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <StyledParagraph>Sync from Arena</StyledParagraph>
          </StyledButton>
          <StyledButton disabled={isLoading} onPress={fetchCollections}>
            Refresh Collections
          </StyledButton>
          <StyledButton disabled={isLoading} onPress={fetchBlocks}>
            Refresh Blocks
          </StyledButton>
          <XStack>
            <StyledLabel bold>Token</StyledLabel>
            <StyledParagraph ellipse>{arenaAccessToken}</StyledParagraph>
          </XStack>
          <StyledButton
            onPress={() => {
              storage.delete(LastSyncedAtKey);
            }}
          >
            Reset Arena Sync Timeline
          </StyledButton>
          <StyledButton
            onPress={() => {
              setBoolean("seenIntro", false);
            }}
          >
            Reset intro seen
          </StyledButton>
          <StyledButton
            onPress={() => {
              removeItem(UserInfoId);
            }}
          >
            Clear user
          </StyledButton>
          <StyledParagraph>
            Only do this if directed to do it in order to reset your schemas. It
            will delete all your data.
          </StyledParagraph>
          <StyledButton
            disabled={isLoading}
            icon={isLoading ? <Spinner size="small" /> : null}
            theme="red"
            backgroundColor="$red8"
            onPress={async () => {
              setIsLoading(true);
              try {
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
                // await initDatabases();
              } catch (err) {
                throw err;
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Reset Databases
          </StyledButton>
          {__DEV__ && (
            <YStack space="$1">
              <H3>pending blocks</H3>
              <StyledParagraph>
                {JSON.stringify(pendingArenaBlocks, null, 2)}
              </StyledParagraph>
            </YStack>
          )}
        </YStack>
      )}
      {/* TODO: bring this back when working */}
      {/* <ButtonWithConfirm
        disabled={isLoading}
        icon={isLoading ? <Spinner size="small" /> : null}
        theme="red"
        backgroundColor="$red8"
        onPress={async () => {
          setIsLoading(true);
          try {
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
          } catch (err) {
            throw err;
          } finally {
            setIsLoading(false);
          }
        }}
      >
        Reset Databases
      </ButtonWithConfirm> */}
    </YStack>
  );
}
