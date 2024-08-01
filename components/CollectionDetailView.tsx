import { YStack, Spinner, ScrollView } from "tamagui";
import { Collection, RemoteSourceType } from "../utils/dataTypes";
import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import {
  ArenaLogo,
  ButtonWithConfirm,
  Collapsible,
  EditableTextOnClick,
  ExternalLinkText,
  StyledButton,
  StyledParagraph,
  StyledText,
} from "./Themed";
import { Stack, useRouter } from "expo-router";
import { createBlock, createChannel } from "../utils/arena";
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
    syncAllRemoteItems,
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
      const { itemsAdded = 0, collectionUpdated = false } =
        (await syncNewRemoteItems(id)) || {};
      alert(
        `Added ${itemsAdded} new items to ${title}${
          collectionUpdated ? " and we updated the collection title too" : ""
        }.`
      );
    } finally {
      setIsLoading(false);
    }
  }
  async function onClickResyncItems() {
    setIsLoading(true);
    try {
      const { itemsAdded = 0, collectionUpdated = false } =
        (await syncAllRemoteItems(id)) || {};
      alert(
        `Added ${itemsAdded} new items to ${title}${
          collectionUpdated ? " and we updated the collection title too" : ""
        }.`
      );
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

  async function syncBlocksFromRemote() {
    setIsLoading(true);
    try {
    } catch (err) {}
    setIsLoading(false);
  }

  async function syncBlocksToRemote() {
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
          await createBlock({
            arenaToken: arenaAccessToken,
            channelIds: [remoteSourceInfo?.arenaId!],
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
          await syncBlockToArena(block, [
            { channelId: channelId.toString(), collectionId: id },
          ]);
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
              // @ts-ignore
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
            {remoteSourceType && (
              <StyledParagraph metadata>
                Syncing to/from{" "}
                <ExternalLinkText
                  href={`https://are.na/channel/${remoteSourceInfo?.arenaId}`}
                >
                  {remoteSourceType}
                </ExternalLinkText>
              </StyledParagraph>
            )}
            {/* <StyledParagraph metadata>
              Collaborators: {collaborators}
            </StyledParagraph> */}
            {/* TODO: update to handle multiple sources */}
            <Collapsible title="Advanced" marginTop="$2">
              <YStack gap="$2">
                {remoteSourceType ? (
                  <>
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
                    <StyledButton
                      onPress={() => syncBlocksToRemote()}
                      disabled={isLoading || !arenaAccessToken}
                      icon={isLoading ? <Spinner size="small" /> : null}
                    >
                      {`Sync blocks to ${remoteSourceType}`}
                      <ArenaLogo style={{ marginLeft: -4 }} />
                    </StyledButton>
                    <StyledText metadata>
                      Both of these happen automatically every few hours when
                      you open Gather. Use if you want a faster update.
                    </StyledText>
                    <StyledButton
                      onPress={onClickResyncItems}
                      disabled={isLoading}
                      icon={isLoading ? <Spinner size="small" /> : null}
                      marginTop="$2"
                    >
                      {`Resync all items from ${remoteSourceType}`}
                      <ArenaLogo style={{ marginLeft: -4 }} />
                    </StyledButton>
                    <StyledText metadata>
                      Use this if blocks are missing from your are.na channel.
                      Please submit some feedback in the Profile tab if this is
                      happening because it's a bug!
                    </StyledText>
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
                  <>
                    <YStack>
                      <ButtonWithConfirm
                        theme="red"
                        onPress={() => onPressFullDelete()}
                        disabled={isLoading}
                        icon={isLoading ? <Spinner size="small" /> : null}
                      >
                        Remove Remote Collection
                      </ButtonWithConfirm>
                      <StyledText metadata>
                        This will remove any blocks that are only in this
                        collection and undo the channel import.
                      </StyledText>
                    </YStack>
                  </>
                )}
              </YStack>
            </Collapsible>
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
