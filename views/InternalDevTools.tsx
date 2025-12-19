import { YStack, H3, XStack, Spinner, Checkbox } from "tamagui";
import {
  StyledButton,
  ButtonWithConfirm,
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
import { MilestoneKey } from "../utils/celebrations";

export function InternalDevTools({}: {}) {
  const {
    trySyncPendingArenaBlocks,
    trySyncNewArenaBlocks,
    getPendingArenaBlocks,
    getUnconnectedBlockCount,
    deleteUnconnectedBlocks,
  } = useContext(DatabaseContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { currentUser, arenaAccessToken } = useContext(UserContext);
  const [pendingArenaBlocks, setPendingArenaBlocks] = useState<any>([]);
  const [unconnectedBlockCount, setUnconnectedBlockCount] = useState<number>(0);

  const [devModeEnabled, setDevModeEnabled] = useStickyValue(
    "devModeEnabled",
    false
  );

  useEffect(() => {
    getPendingArenaBlocks().then((result: any) =>
      setPendingArenaBlocks(result.rows)
    );
    getUnconnectedBlockCount().then(setUnconnectedBlockCount);
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
        <YStack>
          <ButtonWithConfirm
            theme="red"
            disabled={isLoading || unconnectedBlockCount === 0}
            icon={isLoading ? <Spinner size="small" /> : null}
            confirmationTitle={`Delete ${unconnectedBlockCount} orphaned remote blocks?`}
            confirmationDescription="This will permanently delete all remotely-imported blocks that are not connected to any collection. This cannot be undone."
            onPress={async () => {
              setIsLoading(true);
              try {
                const count = await deleteUnconnectedBlocks();
                alert(`Deleted ${count} orphaned remote blocks.`);
                setUnconnectedBlockCount(0);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <StyledParagraph>
              Delete orphaned remote blocks ({unconnectedBlockCount})
            </StyledParagraph>
          </ButtonWithConfirm>
          <StyledText metadata>
            Removes remotely-imported blocks left behind when their collection
            is unlinked. Local blocks without connections are not affected.
          </StyledText>
        </YStack>
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
              removeItem(MilestoneKey);
            }}
            disabled={isLoading}
            icon={isLoading ? <Spinner size="small" /> : null}
            theme="purple"
          >
            Reset milestones
          </StyledButton>
        )}
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
