import { useContext, useState } from "react";
import { Spinner } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { SelectArenaChannel } from "../views/ArenaLogin";
import { StyledButton } from "./Themed";
import { Keyboard } from "react-native";
import {
  arenaClassToBlockType,
  arenaClassToMimeType,
  getChannelContents,
} from "../utils/arena";
import { RemoteSourceType } from "../utils/dataTypes";
import { currentUser } from "../utils/user";

export function ImportArenaChannelSelect({
  isLoading,
  setIsLoading,
  onSuccess,
}: {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  onSuccess?: () => void;
}) {
  const { arenaAccessToken } = useContext(DatabaseContext);
  const { fetchCollections, createCollection, createBlocks } =
    useContext(DatabaseContext);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [arenaChannel, setArenaChannel] = useState<string>("");

  async function onImportChannel() {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const { title, id, contents } = await getChannelContents(
        arenaChannel,
        arenaAccessToken
      );
      let collectionId = selectedCollection;
      if (!collectionId) {
        collectionId = await createCollection({
          title,
          createdBy: currentUser().id,
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: id.toString(),
            arenaClass: "Collection",
          },
        });
      }

      // add blocks
      const blockIds = await createBlocks({
        blocksToInsert: contents.map((block) => ({
          title: block.title,
          description: block.description,
          content:
            block.attachment?.url ||
            // TODO: this is not defined... see arena.ts for example. at least for tiktok videos,
            // it only provides the html iframe code..
            block.embed?.url ||
            block.image?.display.url ||
            block.content,
          type: arenaClassToBlockType(block),
          contentType: arenaClassToMimeType(block),
          source: block.source?.url,
          createdBy: currentUser().id,
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: block.id,
            arenaClass: "Block",
            connectedAt: block.connected_at,
          },
        })),
        collectionId: collectionId!,
      });
      setArenaChannel("");
      // TODO: this should not be needed because `createCollection` calls it
      // but for some reason not showing up.. maybe a read-replica thing?
      fetchCollections();
      // TODO: add toast saying success with new collection name and how many blocks created
      onSuccess?.();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* TODO: maybe just have it import on click? */}
      <SelectArenaChannel
        setArenaChannel={setArenaChannel}
        arenaChannel={arenaChannel}
      />
      {/* <Label>Local collection to import to (optional)</Label>
      <CollectionSelect
        selectedCollection={selectedCollection}
        setSelectedCollection={setSelectedCollection}
      /> */}
      <StyledButton
        onPress={async () => {
          await onImportChannel();
        }}
        disabled={isLoading || !arenaChannel}
        icon={isLoading ? <Spinner size="small" /> : null}
      >
        Import Channel
      </StyledButton>
    </>
  );
}
