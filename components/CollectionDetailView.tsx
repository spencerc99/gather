import { YStack, Spinner, ScrollView } from "tamagui";
import { Collection, RemoteSourceType } from "../utils/dataTypes";
import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import {
  ArenaLogo,
  ExternalLinkText,
  StyledButton,
  StyledParagraph,
  StyledText,
} from "./Themed";
import { Stack, useRouter } from "expo-router";
import { createChannel } from "../utils/arena";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { getCreatedByForRemote } from "../utils/user";

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
    arenaAccessToken,
    getCollectionItems,
    updateCollection,
    upsertConnections,
  } = useContext(DatabaseContext);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function onClickSyncNewItems() {
    setIsLoading(true);
    try {
      await syncNewRemoteItems(id);
    } finally {
      setIsLoading(false);
    }
  }
  useFixExpoRouter3NavigationTitle();

  //   TODO: add confirmation dialog https://tamagui.dev/docs/components/alert-dialog/1.0.0
  async function onPressDelete() {
    setIsLoading(true);
    try {
      await deleteCollection(id.toString());
      alert("Collection deleted!");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/home");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onPressFullDelete() {
    setIsLoading(true);
    try {
      await fullDeleteCollection(id.toString());
      alert("Collection and blocks only in this collection deleted!");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/home");
      }
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
      const { newChannel, addedInfo, numItemsFailed } = await createChannel({
        accessToken: arenaAccessToken,
        title,
        // Reverse order so they get added in right order, since fetched in descending
        itemsToAdd: collectionItems.reverse(),
      });
      await Promise.all([
        upsertConnections(
          addedInfo.map((info) => ({
            blockId: info.id,
            collectionId: id,
            remoteCreatedAt: info.connected_at,
            createdBy: getCreatedByForRemote(
              RemoteSourceType.Arena,
              info.creator_slug
            ),
          }))
        ),
        updateCollection({
          collectionId: id,
          editInfo: {
            remoteSourceType: RemoteSourceType.Arena,
            remoteSourceInfo: {
              arenaId: newChannel.id.toString(),
              arenaClass: "Collection",
            },
          },
        }),
      ]);
      alert(
        `Created ${newChannel.title} on Are.na and added ${
          addedInfo.length
        } items.${
          numItemsFailed > 0
            ? ` ${numItemsFailed} items failed to add. We will try to sync the failed ones again later.`
            : ""
        }}`
      );
    } catch (err) {
      console.error(err);
      alert(
        "Failed to link to Are.na. Please try again on a stable connection."
      );
    } finally {
      setIsLoading(false);
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
            <StyledParagraph title marginBottom="$2">
              {title}
            </StyledParagraph>
            {__DEV__ && <StyledParagraph metadata>ID: {id}</StyledParagraph>}
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
              <StyledButton
                theme="red"
                onPress={() => onPressDelete()}
                disabled={isLoading}
                icon={isLoading ? <Spinner size="small" /> : null}
              >
                Delete Collection
              </StyledButton>
              {remoteSourceType && (
                <YStack>
                  <StyledButton
                    theme="red"
                    onPress={() => onPressFullDelete()}
                    disabled={isLoading}
                    icon={isLoading ? <Spinner size="small" /> : null}
                  >
                    Delete Collection & Contained Blocks
                  </StyledButton>
                  <StyledText metadata>
                    contained blocks are blocks that are only in this channel.
                    use this when you want to "undo" an import.
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
