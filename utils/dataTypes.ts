import { BlockType, MimeType } from "./mimeTypes";

export interface CollectionInsertInfo {
  title: string;
  description?: string;
  thumbnail?: string;
  createdBy: string;
  remoteSourceType?: RemoteSourceType;
  remoteSourceInfo?: ArenaChannelCollectionInfo;
}

export interface Collection extends CollectionInsertInfo {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // mapped out properties
  collaborators: string[]; // of user dids
  numBlocks: number;
  lastConnectedAt: Date | null;
}

export interface Connection {
  blockId: string;
  collectionId: string;
  createdTimestamp: Date;
  createdBy: string;

  // derived
  collectionTitle: string;
  remoteSourceType?: RemoteSourceType;
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
  connectedAt: string;
}

interface RemoteSourceInfoMap {
  [RemoteSourceType.Arena]: ArenaChannelCollectionInfo | ArenaChannelBlockInfo;
}
export interface Block extends Omit<BlockInsertInfo, "collectionsToConnect"> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  numConnections: number;
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
