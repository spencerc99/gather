import { YStack, Spinner, ScrollView } from "tamagui";
import { Collection, RemoteSourceType } from "../utils/dataTypes";
import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import {
  ArenaLogo,
  ButtonWithConfirm,
  EditableTextOnClick,
  ExternalLinkText,
  StyledButton,
  StyledParagraph,
  StyledText,
} from "./Themed";
import { Stack, useRouter } from "expo-router";
import { addBlockToChannel, createChannel } from "../utils/arena";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { UserContext } from "../utils/user";
import { ErrorsContext } from "../utils/errors";
import { useStickyValue } from "../utils/asyncStorage";
import { useQueryClient } from "@tanstack/react-query";

export function CollectionDetailView({
  collection,
}: {
  collection: Collection;
}) {
  const {
    id,
    title,
    description,
    createdAt,
    updatedAt,
    numBlocks: numItems,
    lastConnectedAt,
    remoteSourceInfo,
    remoteSourceType,
  } = collection;
  const {
    syncNewRemoteItems,
    deleteCollection,
    fullDeleteCollection,
    getCollectionItems,
    updateCollection,
    syncBlockToArena,
  } = useContext(DatabaseContext);
  const { arenaAccessToken } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { logError } = useContext(ErrorsContext);
  const queryClient = useQueryClient();
  const [devModeEnabled] = useStickyValue("devModeEnabled", false);
  async function update(updateFn: () => ReturnType<typeof updateCollection>) {
    setIsLoading(true);
    try {
      await updateFn();
    } finally {
      setIsLoading(false);
    }
  }

  async function onClickSyncNewItems() {
    setIsLoading(true);
    try {
      await syncNewRemoteItems(id);
    } finally {
      setIsLoading(false);
    }
  }
  useFixExpoRouter3NavigationTitle();

  async function onPressDelete() {
    setIsLoading(true);
    try {
      await deleteCollection(id.toString());
      alert("Collection deleted!");
      router.replace("/(tabs)/home");
    } finally {
      setIsLoading(false);
    }
  }

  async function onPressFullDelete() {
    setIsLoading(true);
    try {
      await fullDeleteCollection(id.toString());
      alert("Collection and blocks only in this collection deleted!");
      router.replace("/(tabs)/home");
    } finally {
      setIsLoading(false);
    }
  }

  async function resyncBlocks() {
    if (!arenaAccessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const collectionItems = await getCollectionItems(id, {
        page: null,
      });
      const ascending = collectionItems.reverse();
      console.log(`resyncing ${ascending.length} blocks to ${title}`);
      for (const block of ascending) {
        try {
          if (!block.remoteSourceInfo?.arenaId || !remoteSourceInfo?.arenaId) {
            console.log(
              `[WARNING]: missing arenaId for block or collection,  ${block.remoteSourceInfo?.arenaId} ${remoteSourceInfo?.arenaId}`
            );
          }
          console.log(
            `adding block ${block.remoteSourceInfo?.arenaId} to channel ${remoteSourceInfo?.arenaId}`
          );
          await addBlockToChannel({
            arenaToken: arenaAccessToken,
            channelId: remoteSourceInfo?.arenaId!,
            block,
          });
        } catch (err) {
          logError(err);
        }
      }
      console.log("DONE!");
    } catch (err) {}
    setIsLoading(false);
  }

  async function onClickLinkToArena() {
    if (!arenaAccessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const collectionItems = await getCollectionItems(id);
      // TODO: show progress bar status
      const { newChannel } = await createChannel({
        accessToken: arenaAccessToken,
        title,
      });
      await updateCollection({
        collectionId: id,
        editInfo: {
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: newChannel.id.toString(),
            arenaClass: "Collection",
          },
        },
        noInvalidation: true,
      });

      // Reverse order so they get added in right order, since fetched in descending
      const reversedItems = collectionItems.reverse();
      let numItemsFailed = 0;
      const { id: channelId } = newChannel;
      for (const block of reversedItems) {
        try {
          await syncBlockToArena(channelId.toString(), block, id);
        } catch (e) {
          logError(e);
          numItemsFailed++;
        }
      }

      alert(
        `Created ${newChannel.title} on Are.na and added ${
          reversedItems.length - numItemsFailed
        } items.${
          numItemsFailed > 0
            ? ` ${numItemsFailed} items failed to add. We will try to sync the failed ones again later.`
            : ""
        }`
      );
    } catch (err) {
      logError(err);
      alert(
        "Failed to link to Are.na. Please try again on a stable connection."
      );
    } finally {
      setIsLoading(false);
      queryClient.invalidateQueries({
        queryKey: ["collection", { collectionId: id }],
      });
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
        }}
      />
      <ScrollView>
        <YStack padding="10%">
          <YStack flex={1} gap="$1">
            {/* TODO: change all these to labels and make them editable with a save */}
            <EditableTextOnClick
              text={title}
              disabled={isLoading}
              onEdit={async (newTitle) => {
                await update(
                  async () =>
                    await updateCollection({
                      collectionId: id,
                      editInfo: { title: newTitle },
                    })
                );
              }}
              marginBottom="$2"
              inputProps={{
                title: true,
                enterKeyHint: "done",
              }}
            />
            {(__DEV__ || devModeEnabled) && (
              <StyledParagraph metadata>ID: {id}</StyledParagraph>
            )}
            {description && (
              <StyledParagraph color="$gray9">{description}</StyledParagraph>
            )}
            <StyledParagraph metadata>
              {numItems} items
              {/* by{" "} */}
              {/* <StyledParagraph metadata style={{ fontWeight: 700 }}>
                {createdBy}
              </StyledParagraph> */}
            </StyledParagraph>
            <StyledParagraph metadata>
              Created at: {createdAt.toLocaleString()}
            </StyledParagraph>
            <StyledParagraph metadata>
              Updated at: {updatedAt.toLocaleString()}
            </StyledParagraph>
            {lastConnectedAt && (
              <StyledParagraph metadata>
                Last connected at: {lastConnectedAt.toLocaleString()}
              </StyledParagraph>
            )}
            {/* <StyledParagraph metadata>
              Collaborators: {collaborators}
            </StyledParagraph> */}
            {/* TODO: update to handle multiple sources */}
            <YStack gap="$2">
              {remoteSourceType ? (
                <>
                  <StyledParagraph metadata>
                    Syncing to/from{" "}
                    <ExternalLinkText
                      href={`https://are.na/channel/${remoteSourceInfo?.arenaId}`}
                    >
                      {remoteSourceType}
                    </ExternalLinkText>
                  </StyledParagraph>
                  {/* TODO: add a dev button to reset channel to start */}
                  <StyledButton
                    onPress={onClickSyncNewItems}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                    marginTop="$2"
                  >
                    {`Sync new items from ${remoteSourceType}`}
                    <ArenaLogo style={{ marginLeft: -4 }} />
                  </StyledButton>
                  {/* TODO: add a button to "reset" channel from remote, which deletes items that it doesn't find */}
                  {/* <StyledButton
                    onPress={onClickSyncNewItems}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                    marginTop="$2"
                  >
                    {`Sync new items from ${remoteSourceType}`}
                    <ArenaLogo style={{ marginLeft: -4 }} />
                  </StyledButton> */}
                </>
              ) : arenaAccessToken ? (
                <>
                  <StyledButton
                    onPress={onClickLinkToArena}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                    marginTop="$2"
                  >
                    Link collection to Are.na
                    <ArenaLogo style={{ marginLeft: -4 }} />
                  </StyledButton>
                </>
              ) : null}
              <ButtonWithConfirm
                theme="red"
                onPress={() => onPressDelete()}
                disabled={isLoading}
                icon={isLoading ? <Spinner size="small" /> : null}
              >
                Delete Collection
              </ButtonWithConfirm>
              {remoteSourceType && (
                <YStack>
                  <ButtonWithConfirm
                    theme="red"
                    onPress={() => onPressFullDelete()}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                  >
                    Delete Collection & Contained Blocks
                  </ButtonWithConfirm>
                  <StyledText metadata>
                    contained blocks are blocks that are only in this channel.
                    use this when you want to "undo" an import.
                  </StyledText>
                </YStack>
              )}
              {remoteSourceType && (
                <YStack>
                  <StyledButton
                    onPress={() => resyncBlocks()}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                  >
                    Resync blocks
                  </StyledButton>
                  <StyledText metadata>
                    Try to resync all blocks up to the sync source. Use this if
                    for whatever reason you have lost blocks in the remote
                    source and want to push up any missing content.
                  </StyledText>
                </YStack>
              )}
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
