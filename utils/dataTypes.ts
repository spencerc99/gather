import { BlockType, MimeType } from "./mimeTypes";

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
  collectionIds: string[];
}

export interface BlockWithCollectionInfo extends Block {
  collectionRemoteSourceInfo: RemoteSourceInfo;
  collectionRemoteSourceType: RemoteSourceType;
  collectionId: string;
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

  //   TODO: add type
  remoteSourceType?: RemoteSourceType; // map to explicit list of external providers? This can also be used to make the ID mappers, sync methods, etc. Maybe take some inspiration from Wildcard’s site adapters for typing here?
  remoteSourceInfo?: ArenaChannelBlockInfo;
  remoteConnectedAt?: string; // timestamp of when this block was connected to a collection — used to populate the connection info
  connectedBy?: string;

  createdBy: string; // DID of the person who made it?
}

export type BlockEditInfo = Partial<DatabaseBlockInsert>;

export interface BlockInsertInfo extends DatabaseBlockInsert {
  collectionsToConnect?: string[]; // IDs of collections that this block is in
}

export interface BlocksInsertInfo {
  blocksToInsert: DatabaseBlockInsert[];
  collectionId?: string;
}

// NOTE: if not handling deletions, you can add page here
export interface LastSyncedInfo {
  lastSyncedAt: string;
  lastSyncedBlockId: string;
  lastSyncedBlockCreatedAt: string;
}

export interface ArenaImportInfo {
  title: string;
  size: number;
}

export enum SortType {
  Random = "random",
  Created = "created",
}
