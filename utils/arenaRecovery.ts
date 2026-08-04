// ABOUTME: Classifies malformed Are.na upload blocks and replacement processing states.
// ABOUTME: Keeps recovery decisions independent from networking and local storage.
import { Connection, RemoteSourceType } from "./dataTypes";

export const ArenaUploadErrorContent =
  "no implicit conversion of nil into String";

export interface ArenaRecoveryBlock {
  __typename?: string;
  class?: string;
  content?: unknown;
  state?: string;
  type?: string;
}

function getArenaBlockType(block: ArenaRecoveryBlock): string | undefined {
  return block.type ?? block.class ?? block.__typename;
}

function getArenaBlockContent(block: ArenaRecoveryBlock): string {
  if (typeof block.content === "string") {
    return block.content;
  }
  if (block.content && typeof block.content === "object") {
    const content = block.content as {
      plain?: unknown;
      markdown?: unknown;
    };
    if (typeof content.plain === "string") {
      return content.plain;
    }
    if (typeof content.markdown === "string") {
      return content.markdown;
    }
  }
  return "";
}

export function isArenaUploadErrorBlock(
  block: ArenaRecoveryBlock,
): boolean {
  return (
    getArenaBlockType(block) === "Text" &&
    getArenaBlockContent(block).trim() === ArenaUploadErrorContent
  );
}

export function getArenaImageReplacementState(
  block: ArenaRecoveryBlock,
): "processing" | "available" | "failed" {
  const blockType = getArenaBlockType(block);
  if (
    block.state === "failed" ||
    isArenaUploadErrorBlock(block) ||
    (block.state === "available" && blockType !== "Image")
  ) {
    return "failed";
  }
  if (block.state === "available" && blockType === "Image") {
    return "available";
  }
  return "processing";
}

export function getArenaRecoveryCollectionInfos(
  connections: Pick<
    Connection,
    "collectionId" | "remoteSourceInfo" | "remoteSourceType"
  >[],
): Array<{ channelId: string; collectionId: string }> {
  return connections
    .filter(
      (connection) =>
        connection.remoteSourceType === RemoteSourceType.Arena &&
        connection.remoteSourceInfo?.arenaClass === "Collection",
    )
    .map((connection) => ({
      channelId: connection.remoteSourceInfo!.arenaId,
      collectionId: connection.collectionId,
    }));
}
