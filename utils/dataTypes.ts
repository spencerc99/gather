import { BlockType, MimeType } from "./mimeTypes";
import { ensureUnreachable } from "./react";

export interface CollectionInsertInfo {
  title: string;
  description?: string;
  thumbnail?: string;
  createdBy: string;
  remoteSourceType?: RemoteSourceType;
  remoteSourceInfo?: ArenaChannelCollectionInfo;
}

export type CollectionEditInfo = Partial<CollectionInsertInfo>;

export interface Collection extends CollectionInsertInfo {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // mapped out properties
  collaborators: string[]; // of user dids
  numBlocks: number;
  lastConnectedAt: Date | null;
}

export interface ConnectionInsertInfo {
  blockId: string;
  collectionId: string;
  remoteCreatedAt?: string;
  createdBy: string;
}

export interface BlockConnectionInsertInfo {
  collectionId: string;
  remoteCreatedAt?: string;
  createdBy?: string;
}

export interface Connection {
  blockId: string;
  collectionId: string;
  createdTimestamp: Date;
  createdBy: string;
  remoteCreatedAt?: Date;

  // derived
  collectionTitle: string;
  remoteSourceType?: RemoteSourceType;
  remoteSourceInfo?: RemoteSourceInfo;
}

export interface InsertBlockConnection {
  blockId: string;
  remoteCreatedAt?: string;
  createdBy: string;
}

export enum RemoteSourceType {
  Arena = "Arena",
}

export type RemoteSourceInfo = RemoteSourceInfoMap[RemoteSourceType];

export interface ArenaChannelCollectionInfo {
  arenaId: string;
  arenaClass: "Collection";
}
export interface ArenaChannelBlockInfo {
  arenaId: string;
  arenaClass: "Block";
}

interface RemoteSourceInfoMap {
  [RemoteSourceType.Arena]: ArenaChannelCollectionInfo | ArenaChannelBlockInfo;
}
export interface Block
  extends Omit<BlockInsertInfo, "collectionsToConnect" | "remoteConnectedAt"> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  numConnections: number;
  remoteConnectedAt?: Date | null; // only present when selecting from a single collection
  connectedAt?: Date | null; // only present when selecting from a single collection
  collectionIds: string[];
}

export interface BlockWithCollectionInfo extends Block {
  collectionRemoteSourceInfos: RemoteSourceInfo[];
  collectionRemoteSourceTypes: RemoteSourceType[];
  collectionIds: string[];
}

export interface CollectionBlock extends Block {
  remoteConnectedAt: Date | null; // only present when selecting from a single collection
}
export interface DatabaseBlockInsert {
  title?: string;
  description?: string; // long-form description about the object, could include things like tags here and those get automatically extracted?
  content: string; // could be either the data itself or a path to the data if a rich media object
  type: BlockType;
  contentType?: MimeType;
  source?: string; // the URL where the object was captured from. If a photo with EXIF data, then the location metadata

  localAssetId?: string;

  remoteSourceType?: RemoteSourceType; // map to explicit list of external providers? This can also be used to make the ID mappers, sync methods, etc. Maybe take some inspiration from Wildcard’s site adapters for typing here?
  remoteSourceInfo?: ArenaChannelBlockInfo;
  remoteConnectedAt?: string; // timestamp of when this block was connected to a collection — used to populate the connection info
  connectedBy?: string;

  createdBy: string; // DID of the person who made it?

  captureTime?: number; // unix timestamp of when the block was captured for external media
  location?: LocationMetadata;
}
export interface LocationMetadata {
  latitude: number;
  longitude: number;
  name?: string;
  street?: string;
  city?: string;
  region?: string;
  country?: string;
}

export type BlockEditInfo = Partial<DatabaseBlockInsert>;

export interface BlockInsertInfo extends DatabaseBlockInsert {
  collectionsToConnect?: BlockConnectionInsertInfo[]; // IDs of collections that this block is in
}

export interface BlocksInsertInfo {
  blocksToInsert: DatabaseBlockInsert[];
  collectionId?: string;
}

// NOTE: if not handling deletions, you can add page here
export interface LastSyncedInfo {
  lastSyncedAt: string;
  lastSyncedBlockId?: string;
  lastSyncedBlockCreatedAt?: string;
}

export interface ArenaImportInfo {
  title: string;
  size: number;
}

export enum SortType {
  Random = "random",
  Created = "created",
  RemoteCreated = "remote_created",
}

export function deriveContentTypeFromBlockType(type: BlockType): MimeType {
  switch (type) {
    case BlockType.Text:
    case BlockType.Link:
      return MimeType[".txt"];
    case BlockType.Image:
      return MimeType[".jpg"];
    case BlockType.Audio:
      return MimeType[".wav"];
    case BlockType.Video:
      return MimeType[".mp4"];
    case BlockType.Document:
      throw new Error("Document type not supported yet");
    default:
      return ensureUnreachable(type);
  }
}
