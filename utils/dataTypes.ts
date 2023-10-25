export interface CollectionInsertInfo {
  title: string;
  description?: string;
  createdBy: string;
  remoteSourceType?: RemoteSourceType;
  remoteSourceInfo?: RemoteSourceInfo;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // DID of the person who made it?

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
