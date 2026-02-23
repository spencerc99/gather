import { YStack, XStack, Spinner, ScrollView } from "tamagui";
import { Collection, RemoteSourceType } from "../utils/dataTypes";
import { useContext, useMemo, useState } from "react";
import { DatabaseContext, useCollection } from "../utils/db";
import {
  ArenaLogo,
  ButtonWithConfirm,
  Collapsible,
  EditableTextOnClick,
  ExternalLinkText,
  Icon,
  StyledButton,
  StyledParagraph,
  StyledText,
} from "./Themed";
import { Stack, useRouter } from "expo-router";
import { createBlock, createChannel } from "../utils/arena";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { UserContext } from "../utils/user";
import { ErrorsContext } from "../utils/errors";
import { useStickyValue } from "../utils/mmkv";
import { useQueryClient } from "@tanstack/react-query";
import { CollectionSelect } from "./CollectionSelect";
import { TouchableOpacity } from "react-native";

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
    offloadCollectionBlocks,
    mergeCollections,
  } = useContext(DatabaseContext);
  const { arenaAccessToken } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { logError } = useContext(ErrorsContext);
  const queryClient = useQueryClient();
  const [devModeEnabled] = useStickyValue("devModeEnabled", false);

  // Merge state
  const [selectedMergeCollectionId, setSelectedMergeCollectionId] = useState<
    string | null
  >(null);
  // mergeDirection: true = merge selected INTO current (current survives)
  // mergeDirection: false = merge current INTO selected (selected survives)
  const [mergeDirection, setMergeDirection] = useState(true);
  const { data: selectedMergeCollection } = useCollection(
    selectedMergeCollectionId || ""
  );
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

  async function onClickOffload() {
    if (!arenaAccessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const { offloadedCount, failedCount } = await offloadCollectionBlocks(
        id.toString()
      );
      if (failedCount > 0) {
        alert(
          `Offloaded ${offloadedCount} items to remote storage. ${failedCount} items failed.`
        );
      } else if (offloadedCount === 0) {
        alert("No items to offload. All items are already using remote storage.");
      } else {
        alert(`Offloaded ${offloadedCount} items to remote storage.`);
      }
    } catch (err) {
      logError(err);
      alert("Failed to offload items. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onMerge() {
    if (!selectedMergeCollectionId) return;

    setIsLoading(true);
    try {
      const sourceId = mergeDirection
        ? selectedMergeCollectionId
        : id.toString();
      const targetId = mergeDirection
        ? id.toString()
        : selectedMergeCollectionId;

      const { mergedCount, skippedDuplicates } = await mergeCollections({
        sourceId,
        targetId,
      });

      const targetName = mergeDirection
        ? title
        : selectedMergeCollection?.title ?? selectedMergeCollectionId;
      alert(
        `Merged ${mergedCount} items into "${targetName}".${
          skippedDuplicates > 0
            ? ` ${skippedDuplicates} duplicates were skipped.`
            : ""
        }`
      );

      setSelectedMergeCollectionId(null);
      setMergeDirection(true);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["blocks"] });

      if (!mergeDirection) {
        // Current collection was deleted, navigate to the target
        queryClient.invalidateQueries({
          queryKey: ["collection", { collectionId: selectedMergeCollectionId }],
        });
        router.replace(`/collection/${selectedMergeCollectionId}`);
      } else {
        // Staying on current collection, refresh it
        queryClient.invalidateQueries({
          queryKey: ["collection", { collectionId: id.toString() }],
        });
      }
    } catch (err) {
      logError(err);
      alert("Failed to merge collections. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
                    <YStack marginTop="$2">
                      <StyledButton
                        onPress={onClickOffload}
                        disabled={isLoading || !arenaAccessToken}
                        icon={isLoading ? <Spinner size="small" /> : null}
                      >
                        Offload items to remote storage
                        <ArenaLogo style={{ marginLeft: -4 }} />
                      </StyledButton>
                      <StyledText metadata>
                        Deletes local files and uses remote URLs instead, saving
                        local storage space. Items remain visible in the app.
                      </StyledText>
                    </YStack>
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
                <YStack marginTop="$2" gap="$2">
                  <StyledText bold>Merge Collections</StyledText>

                  {/* Collection pair display with swap */}
                  <XStack
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                    paddingVertical="$2"
                  >
                    {/* Current collection (fixed) */}
                    <YStack
                      flex={1}
                      backgroundColor={mergeDirection ? "$orange4" : "$gray4"}
                      padding="$2"
                      borderRadius="$2"
                      alignItems="center"
                    >
                      <StyledText size="$1" color="$gray11">
                        {mergeDirection ? "Keep" : "Delete"}
                      </StyledText>
                      <StyledText
                        numberOfLines={1}
                        bold={mergeDirection}
                        textAlign="center"
                      >
                        {title}
                      </StyledText>
                    </YStack>

                    {/* Swap button */}
                    <TouchableOpacity
                      onPress={() => setMergeDirection(!mergeDirection)}
                    >
                      <YStack
                        backgroundColor="$blue4"
                        padding="$2"
                        borderRadius="$4"
                      >
                        <Icon name="swap-horizontal" size={20} />
                      </YStack>
                    </TouchableOpacity>

                    {/* Selected collection (picker) */}
                    <YStack
                      flex={1}
                      backgroundColor={mergeDirection ? "$gray4" : "$orange4"}
                      padding="$2"
                      borderRadius="$2"
                      alignItems="center"
                    >
                      <StyledText size="$1" color="$gray11">
                        {mergeDirection ? "Delete" : "Keep"}
                      </StyledText>
                      <CollectionSelect
                        selectedCollection={selectedMergeCollectionId}
                        setSelectedCollection={setSelectedMergeCollectionId}
                        excludeCollectionIds={[id.toString()]}
                        collectionPlaceholder="Select..."
                        triggerProps={{
                          backgroundColor: "transparent",
                          borderWidth: 0,
                          paddingHorizontal: 0,
                          paddingVertical: 0,
                          minHeight: 0,
                          height: "auto",
                          width: "100%",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      />
                    </YStack>
                  </XStack>

                  {/* Merge description */}
                  {selectedMergeCollectionId && selectedMergeCollection && (
                    <StyledText metadata textAlign="center">
                      {mergeDirection
                        ? `"${selectedMergeCollection.title}" will be deleted. Its items will be moved into "${title}".`
                        : `"${title}" will be deleted. Its items will be moved into "${selectedMergeCollection.title}".`}
                    </StyledText>
                  )}

                  {/* Merge button */}
                  <ButtonWithConfirm
                    onPress={onMerge}
                    disabled={isLoading || !selectedMergeCollectionId}
                    icon={isLoading ? <Spinner size="small" /> : null}
                    confirmationTitle="Merge collections?"
                    confirmationDescription={
                      selectedMergeCollection
                        ? mergeDirection
                          ? `"${selectedMergeCollection.title}" will be permanently deleted. Its items will be moved into "${title}".`
                          : `"${title}" will be permanently deleted. Its items will be moved into "${selectedMergeCollection.title}".`
                        : "Select a collection first."
                    }
                  >
                    Merge
                  </ButtonWithConfirm>

                  <StyledText metadata>
                    Combine two collections into one, keeping all items.
                  </StyledText>
                </YStack>
                {remoteSourceType ? (
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
                        collection and undo the channel import. The collection
                        will still exist on {remoteSourceType}.
                      </StyledText>
                    </YStack>
                  </>
                ) : (
                  <ButtonWithConfirm
                    theme="red"
                    onPress={() => onPressDelete()}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                  >
                    Delete Collection
                  </ButtonWithConfirm>
                )}
              </YStack>
            </Collapsible>
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
