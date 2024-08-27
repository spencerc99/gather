import { YStack, H3, XStack, Spinner, Checkbox } from "tamagui";
import {
  StyledButton,
  Icon,
  StyledText,
  StyledParagraph,
  LinkButton,
} from "../components/Themed";
import {
  setBoolean,
  removeItem,
  LastSyncedAtKey,
  useStickyValue,
  ContributionsKey,
} from "../utils/mmkv";
import { UserContext, UserInfoId } from "../utils/user";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { storage } from "../utils/mmkv";
import {
  ArenaClientId,
  ArenaClientSecret,
  ArenaGraphqlKey,
} from "../utils/arena";

export function InternalDevTools({}: {}) {
  const {
    trySyncPendingArenaBlocks,
    trySyncNewArenaBlocks,
    getPendingArenaBlocks,
  } = useContext(DatabaseContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { currentUser, arenaAccessToken } = useContext(UserContext);
  const [pendingArenaBlocks, setPendingArenaBlocks] = useState<any>([]);

  const [devModeEnabled, setDevModeEnabled] = useStickyValue(
    "devModeEnabled",
    false
  );

  useEffect(() => {
    getPendingArenaBlocks().then((result: any) =>
      setPendingArenaBlocks(result.rows)
    );
  }, []);

  return (
    <YStack gap="$2">
      <H3>Internal Dev Tools</H3>
      <YStack space="$2">
        <StyledText>
          These are available for testing and debugging purposes. If you run
          into any issues, please contact Spencer first, and he might direct you
          to these buttons if there are issues :)
        </StyledText>
        <XStack alignItems="center" gap="$2">
          <StyledText bold>Dev Mode?</StyledText>
          <Checkbox
            checked={devModeEnabled}
            onCheckedChange={(checked) => setDevModeEnabled(Boolean(checked))}
          >
            <Checkbox.Indicator>
              <Icon name="checkmark" />
            </Checkbox.Indicator>
          </Checkbox>
        </XStack>
        <YStack>
          <StyledText bold>User ID</StyledText>
          <StyledParagraph>{currentUser?.id}</StyledParagraph>
        </YStack>
        <YStack>
          <StyledText bold>Token:</StyledText>
          <StyledParagraph ellipse>{arenaAccessToken}</StyledParagraph>
        </YStack>
        {__DEV__ && (
          <YStack>
            <StyledParagraph>{ArenaClientId}</StyledParagraph>
            <StyledParagraph>{ArenaClientSecret}</StyledParagraph>
            <StyledParagraph>{ArenaGraphqlKey}</StyledParagraph>
          </YStack>
        )}
        <LinkButton theme="red" href="/errors">
          View Error Log
        </LinkButton>
        <StyledButton
          disabled={isLoading}
          icon={isLoading ? <Spinner size="small" /> : null}
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
          icon={isLoading ? <Spinner size="small" /> : null}
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

        <StyledButton
          onPress={() => {
            storage.delete(LastSyncedAtKey);
          }}
          disabled={isLoading}
          icon={isLoading ? <Spinner size="small" /> : null}
        >
          Reset Arena Sync Timeline
        </StyledButton>
        <StyledButton
          onPress={() => {
            setBoolean("seenIntro", false);
          }}
          disabled={isLoading}
          icon={isLoading ? <Spinner size="small" /> : null}
        >
          Reset intro seen
        </StyledButton>
        {__DEV__ && (
          <StyledButton
            onPress={() => {
              removeItem(ContributionsKey);
            }}
            disabled={isLoading}
            icon={isLoading ? <Spinner size="small" /> : null}
            theme="purple"
          >
            Reset contributions
          </StyledButton>
        )}
        {__DEV__ && (
          <StyledButton
            onPress={() => {
              removeItem(UserInfoId);
            }}
            disabled={isLoading}
            icon={isLoading ? <Spinner size="small" /> : null}
            theme="purple"
          >
            Clear user
          </StyledButton>
        )}
        {__DEV__ && (
          <YStack space="$1">
            <H3>pending blocks</H3>
            <StyledParagraph>
              {JSON.stringify(pendingArenaBlocks, null, 2)}
            </StyledParagraph>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
