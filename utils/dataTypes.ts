export interface CollectionInsertInfo {
  title: string;
  description?: string;
  thumbnail?: string;
  createdBy: string;
  remoteSourceType?: RemoteSourceType;
  remoteSourceInfo?: RemoteSourceInfo;
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
}

export enum RemoteSourceType {
  Arena = "Arena",
}

export type RemoteSourceInfo = RemoteSourceInfoMap[RemoteSourceType];

interface RemoteSourceInfoMap {
  [RemoteSourceType.Arena]: {
    arenaId: string;
    arenaClass: "Block" | "Collection";
  };
}
