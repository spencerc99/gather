import { InteractionManager, Platform } from "react-native";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { ErrorsContext } from "./errors";
import {
  getBlock as getArenaBlock,
  getChannelItems,
  getPendingCollectionUpdates,
  RawArenaBlock,
  rawArenaBlocksToBlockInsertInfo,
  recordPendingBlockUpdate,
  recordPendingCollectionUpdate,
  removePendingCollectionUpdate,
  updateArenaChannel,
} from "./arena";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebounce, useDebounceValue } from "tamagui";
import { ShareIntent } from "../hooks/useShareIntent";
import {
  ArenaChannelInfo,
  createBlock as createBlockArena,
  getChannelInfo,
  getChannelInfoFromUrl,
  getPendingBlockUpdates,
  removeBlockFromChannel,
  removePendingBlockUpdate,
  updateArenaBlock,
} from "./arena";
import {
  CollectionToReviewKey,
  getLastSyncedInfoForChannel,
  getLastSyncedRemoteInfo,
  updateLastSyncedInfoForChannel,
  updateLastSyncedRemoteInfo,
  useStickyValue,
} from "./asyncStorage";
import { PHOTOS_FOLDER, intializeFilesystemFolder } from "./blobs";
import {
  ArenaImportInfo,
  Block,
  BlockConnectionInsertInfo,
  BlockEditInfo,
  BlockInsertInfo,
  BlockWithCollectionInfo,
  BlocksInsertInfo,
  Collection,
  CollectionBlock,
  CollectionEditInfo,
  CollectionInsertInfo,
  Connection,
  ConnectionInsertInfo,
  InsertBlockConnection,
  RemoteSourceInfo,
  RemoteSourceType,
  SortType,
} from "./dataTypes";
import { convertDbTimestampToDate } from "./date";
import { Indices, Migrations, migrateAmpersandEscape } from "./db/migrations";
import { BlockType, FileBlockTypes } from "./mimeTypes";
import { UserContext } from "./user";
import { ensure, ensureUnreachable } from "./react";
import { NetworkContext } from "./network";
import { getCreatedByForRemote } from "./remote";
import {
  getEscapedSearchString,
  mapBlockContentToPath,
  mapDbBlockToBlock,
  mapSnakeCaseToCamelCaseProperties,
} from "./dbUtils";

function openDatabase() {
  if (Platform.OS === "web") {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        };
      },
      transactionAsync: () => {
        return {
          executeSqlAsync: () => {},
        };
      },
      execAsync: () => {
        return [{ rows: [] }];
      },
    } as unknown as SQLite.SQLiteDatabase;
  }

  const db = SQLite.openDatabase("db.db");
  return db;
}

const db = openDatabase();

function inParam(sql: string, arr: (string | number | null)[]) {
  // TODO: this needs to handle adding quotes if a string (also this doesn't handle null?)
  return sql.replace("?#", arr.join(","));
}

function mapDbCollectionToCollection(collection: any): Collection {
  const collectionMappedToCamelCase =
    mapSnakeCaseToCamelCaseProperties(collection);
  // @ts-ignore
  return {
    ...collectionMappedToCamelCase,
    // TODO: resolve schema so you dont have to do this because its leading to a lot of confusing errors downstraem from types
    id: collection.id.toString(),
    createdAt: convertDbTimestampToDate(collection.created_timestamp),
    updatedAt: convertDbTimestampToDate(collection.updated_timestamp),
    createdBy: collection.created_by,
    lastConnectedAt: collection.last_connected_at
      ? convertDbTimestampToDate(collection.last_connected_at)
      : undefined,
    remoteSourceType:
      collectionMappedToCamelCase.remoteSourceType as RemoteSourceType,
    remoteSourceInfo: collectionMappedToCamelCase.remoteSourceInfo
      ? (JSON.parse(
          collectionMappedToCamelCase.remoteSourceInfo
        ) as RemoteSourceInfo)
      : null,
    // TODO: add collaborators
    collaborators: [],
  } as Collection;
}

const BlockInsertChunkSize = 10;
function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

export const BlockSelectLimit = 15;
const CollectionSelectLimit = 15;

interface GetBlocksOptions {
  page?: number | null;
  whereClause?: string;
  havingClause?: string;
  sortType?: SortType;
  seed?: number;
  search?: string;
}
type GetCollectionsOptions = GetBlocksOptions;
interface ArenaCollectionInfo {
  collectionId: string;
  channelId: string;
}

interface DatabaseContextProps {
  getBlocks: (opts?: GetBlocksOptions) => Promise<Block[]>;
  // localBlocks: Block[] | null;
  createBlocks: (
    blocks: BlocksInsertInfo
  ) => Promise<Array<{ blockId: string; created: boolean }>>;
  getBlock: (blockId: string) => Promise<Block>;
  updateBlock: (opts: {
    blockId: string;
    editInfo: BlockEditInfo;
  }) => Promise<Block | undefined>;
  deleteBlock: (id: string) => void;
  getConnectionsForBlock: (blockId: string) => Promise<Connection[]>;

  getCollections: (opts?: GetCollectionsOptions) => Promise<Collection[]>;
  getArenaCollectionIds: () => Promise<Set<string>>;
  createCollection: (collection: CollectionInsertInfo) => Promise<string>;
  updateCollection: (opts: {
    collectionId: string;
    editInfo: CollectionEditInfo;
    ignoreRemoteUpdate?: boolean;
    noInvalidation?: boolean;
  }) => Promise<Collection | undefined>;
  getCollectionItems: (
    collectionId: string,
    options?: GetBlocksOptions
  ) => Promise<CollectionBlock[]>;
  syncNewRemoteItems: (
    collectionId: string
  ) => Promise<{ itemsAdded: number; collectionUpdated: boolean } | undefined>;
  syncAllRemoteItems: (
    collectionId: string
  ) => Promise<{ itemsAdded: number; collectionUpdated: boolean } | undefined>;
  syncBlockToArena: (
    block: Block,
    collectionInfos: ArenaCollectionInfo[]
  ) => Promise<RawArenaBlock | undefined>;
  getCollection: (collectionId: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  fullDeleteCollection: (id: string) => Promise<void>;

  addConnections({
    blockId,
    connections,
  }: Pick<ConnectionInsertInfo, "blockId"> & {
    connections: BlockConnectionInsertInfo[];
  }): Promise<void>;
  upsertConnections(connections: ConnectionInsertInfo[]): Promise<void>;
  replaceConnections(blockId: string, collectionIds: string[]): Promise<void>;

  // share intent
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;

  // arena
  tryImportArenaChannel: (
    arenaChannel: string | ArenaChannelInfo,
    selectedCollection?: string
  ) => Promise<ArenaImportInfo>;

  // internal
  db: SQLite.SQLiteDatabase;
  initDatabases: () => Promise<void>;
  trySyncPendingArenaBlocks: () => void;
  trySyncNewArenaBlocks: () => void;
  getPendingArenaBlocks: () => any;
  selectedReviewCollection: string | null;
  setSelectedReviewCollection: (collectionId: string | null) => void;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  createBlocks: async () => {
    throw new Error("not yet loaded");
  },
  getBlock: async () => {
    throw new Error("not yet loaded");
  },
  updateBlock: async () => {
    throw new Error("not yet loaded");
  },
  deleteBlock: () => {},

  getConnectionsForBlock: async () => [],

  createCollection: async () => {
    throw new Error("not yet loaded");
  },
  updateCollection: async () => {
    throw new Error("not yet loaded");
  },
  getCollection: async () => {
    throw new Error("not yet loaded");
  },
  deleteCollection: async () => {},
  fullDeleteCollection: async () => {},
  getCollectionItems: async () => [],
  syncNewRemoteItems: async () => {
    throw new Error("not yet loaded");
  },
  syncAllRemoteItems: async () => {
    throw new Error("not yet loaded");
  },
  syncBlockToArena: async () => {
    throw new Error("not yet loaded");
  },

  addConnections: async () => {},
  upsertConnections: async () => {},
  replaceConnections: async () => {},

  setShareIntent: () => {},
  shareIntent: null,

  tryImportArenaChannel: async () => {
    throw new Error("not yet loaded");
  },

  db,
  initDatabases: async () => {},
  trySyncPendingArenaBlocks: () => {},
  trySyncNewArenaBlocks: () => {},
  getPendingArenaBlocks: () => {},
  selectedReviewCollection: null,
  setSelectedReviewCollection: () => {},
  getBlocks: async (opts) => {
    return [];
  },
  getCollections: async (opts) => {
    return [];
  },
  getArenaCollectionIds: () => {
    throw new Error("Function not implemented.");
  },
});

function camelCaseToSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function handleSqlErrors(
  results:
    | (SQLite.ResultSet | SQLite.ResultSetError)[]
    | SQLite.ResultSet
    | SQLite.ResultSetError
): asserts results is typeof results extends any[]
  ? SQLite.ResultSet[]
  : SQLite.ResultSet {
  const errors: SQLite.ResultSetError[] = ([] as any[])
    .concat(results)
    .filter((result) => "error" in result);
  if (errors.length) {
    if (errors.length === 1) {
      throw errors[0].error;
    }

    throw new Error(
      `${errors.length} error(s): ${errors
        .map((e) => e.error.message)
        .join("\n")}`
    );
  }
}

export function DatabaseProvider({ children }: PropsWithChildren<{}>) {
  const { currentUser, arenaAccessToken } = useContext(UserContext);
  const { isConnected } = useContext(NetworkContext);
  const [selectedReviewCollection, setSelectedReviewCollection] =
    useStickyValue<string | null>(CollectionToReviewKey, null);
  const queuedBlocksToSync = useRef<Set<string>>(new Set<string>());

  // Ref to keep track of whether the sync is already running
  const isSyncingRef = useRef(false);
  const { logError } = useContext(ErrorsContext);
  // Queue to store the triggers
  const triggerQueueRef = useRef<(() => void)[]>([]);

  // Function to trigger the sync
  const triggerBlockSync = () => {
    const syncFunction = async () => {
      isSyncingRef.current = true;
      try {
        await trySyncPendingArenaBlocks();
        const nextTrigger = triggerQueueRef.current.shift();
        if (nextTrigger) {
          await nextTrigger();
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    if (triggerQueueRef.current.length === 0 && !isSyncingRef.current) {
      // If the queue is empty, start the sync process
      syncFunction();
    } else {
      // If the queue is not empty, add the sync function to the queue
      triggerQueueRef.current.push(syncFunction);
    }
  };
  const debouncedTriggerBlockSync = useDebounce(
    triggerBlockSync,
    10 * 1000 // batch updates every 10 seconds
  );

  useEffect(() => {
    InteractionManager.runAfterInteractions(async () => {
      await Promise.all([initDatabases(), intializeFilesystemFolder(), ,]);
    });
  }, []);

  useEffect(() => {
    // TODO: change this to only when you go to the collection? or only for most recent collections? i think this is freezing up the app on start
    if (!currentUser || !arenaAccessToken) {
      return;
    }
    InteractionManager.runAfterInteractions(async () => {
      await syncWithArena();
    });
  }, [arenaAccessToken, currentUser]);

  const queryClient = useQueryClient();

  async function initDatabases() {
    await db.transactionAsync(async (tx) => {
      // Set up tables
      // TODO: figure out id scheme
      try {
        const [...results] = await Promise.all([
          tx.executeSqlAsync(
            `CREATE TABLE IF NOT EXISTS blocks (
              id integer PRIMARY KEY AUTOINCREMENT,
              title varchar(128),
              content TEXT NOT NULL,
              description TEXT,
              type varchar(128) NOT NULL,
              content_type varchar(128),
              local_asset_id varchar(128), 
              source TEXT,
              remote_source_type varchar(128),
              remote_source_info blob,
              created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              deletion_timestamp timestamp,
              created_by TEXT NOT NULL,
              arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'))
          );`
          ),
          tx.executeSqlAsync(
            `CREATE TABLE IF NOT EXISTS collections (
              id integer PRIMARY KEY AUTOINCREMENT,
              title varchar(128) NOT NULL,
              description TEXT,
              thumbnail TEXT,
              created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              created_by TEXT NOT NULL,
              remote_source_type varchar(128),
              remote_source_info blob ,
              arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'))
          );`
          ),
        ]);

        const result = await tx.executeSqlAsync(
          `CREATE TABLE IF NOT EXISTS connections(
              block_id integer NOT NULL,
              collection_id integer NOT NULL,
              created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              created_by TEXT NOT NULL,
              remote_created_at timestamp,
              remote_connected_at_datetime AS (datetime(remote_created_at)),
  
              PRIMARY KEY (block_id, collection_id),
              FOREIGN KEY (block_id) REFERENCES blocks(id),
              FOREIGN KEY (collection_id) REFERENCES collections(id)
          );`
        );

        // await migrateAmpersandEscape(db);

        // Perform migrations
        for (const migration of Migrations) {
          // this is to handle alter table add column when columns already exists
          try {
            await tx.executeSqlAsync(migration);
          } catch (err: unknown) {
            if ((err as Error).message.includes("duplicate column name")) {
              continue;
            }
            throw err;
          }
        }

        // Create indices
        for (const index of Indices) {
          await tx.executeSqlAsync(index);
        }
      } catch (err) {
        logError(err);
      }
    }, false);
  }

  // TODO:
  // async function insertBlocks(blocksToInsert: DatabaseBlockInsert[]) {
  //   await db.transactionAsync(async (tx) => {
  //     const insertChunks = chunkArray(blocksToInsert, BlockInsertChunkSize);
  //     for (const chunk of insertChunks) {
  //       const result = await tx.executeSqlAsync(
  //         `
  //       INSERT INTO blocks (
  //           title,
  //           description,
  //           content,
  //           type,
  //           content_type,
  //           source,
  //           remote_source_type,
  //           created_by,
  //           remote_source_info,
  //           local_asset_id
  //       ) VALUES ${chunk
  //         .map(
  //           (c) => `(
  //           ?,
  //           ?,
  //           ?,
  //           ?,
  //           ?,
  //           ?,
  //           ?,
  //           ?,
  //           ?,
  //           ?
  //       )`
  //         )
  //         .join(",\n")}
  //       RETURNING *;`,
  //         // @ts-ignore
  //         [
  //           ...chunk.flatMap((block) => [
  //             block.title || null,
  //             block.description || null,
  //             block.content,
  //             block.type,
  //             block.contentType,
  //             block.source || null,
  //             block.remoteSourceType || null,
  //             block.createdBy,
  //             block.remoteSourceInfo
  //               ? JSON.stringify(block.remoteSourceInfo)
  //               : null,
  //             block.localAssetId,
  //           ]),
  //         ]
  //       );
  //       handleSqlErrors(result);
  //       // TODO: figure out how to get the ids from all of the inserts.
  //     }
  //   });
  // }

  const createBlocksBase = async ({
    blocksToInsert,
    collectionId,
  }: BlocksInsertInfo): Promise<
    Array<{ blockId: string; created: boolean }>
  > => {
    // TODO: change to use insertBlocks
    const blockInfos = await Promise.all(
      blocksToInsert.map(async (block) => createBlock(block))
    );
    const blockIds = blockInfos.map(({ blockId }) => blockId);

    if (collectionId) {
      const blockConnections = blockIds.map((blockId, idx) => ({
        blockId: blockId,
        // TODO: this is kinda jank, should really be using directly from arena item
        // but because we are doing the logic to extract that into this its effectively
        // the same info
        remoteCreatedAt: blocksToInsert[idx].remoteConnectedAt,
        createdBy: blocksToInsert[idx].connectedBy || currentUser!.id,
      }));
      await addConnectionsToCollection({ collectionId, blockConnections });
    }
    return blockInfos;
  };

  const createBlocksMutation = useMutation({
    mutationFn: createBlocksBase,
    onSuccess: (blockInfos, { collectionId, blocksToInsert }) => {
      console.log("success!!");
      // queryClient.setQueryData<InfiniteData<Block[]>>(
      //   ["blocks", { collectionId }],
      //   // @ts-ignore
      //   (old) => {
      //     if (!old) {
      //       return;
      //     }
      //     let blockIdx = 0;
      //     if ("pages" in old) {
      //       console.log("updating!");
      //       // format {"pageParams": [0], "pages": [{"blocks": [Array], "nextId": 1, "previousId": undefined}]}
      //       return {
      //         ...old,
      //         pages: old.pages.map((page) => ({
      //           // @ts-ignore
      //           blocks: page.blocks.map((b) =>
      //             b.id !== "..."
      //               ? b
      //               : { ...b, id: blockInfos[blockIdx++].blockId }
      //           ),
      //           ...page,
      //         })),
      //       };
      //     } else if (Array.isArray(old)) {
      //       // @ts-ignore
      //       return (old || []).map((b) =>
      //         b.id !== "..." ? b : { ...b, id: blockInfos[blockIdx++].blockId }
      //       );
      //     }
      //   }
      // );

      queryClient.invalidateQueries({ queryKey: ["blocks", { collectionId }] });
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    // onMutate: async ({ blocksToInsert, collectionId }) => {
    //   // Cancel any outgoing refetches
    //   // (so they don't overwrite our optimistic update)
    //   await queryClient.cancelQueries({
    //     queryKey: ["blocks", { collectionId }],
    //   });

    //   // Snapshot the previous value
    //   const previousBlocks = queryClient.getQueryData([
    //     "blocks",
    //     { collectionId },
    //   ]);

    //   // Optimistically update to the new value
    //   queryClient.setQueryData<InfiniteData<Block[]>>(
    //     ["blocks", { collectionId }],
    //     // @ts-ignore
    //     (old) => {
    //       const optimisticBlocks = blocksToInsert.map((block) => ({
    //         id: "...",
    //         ...block,
    //         collectionIds: collectionId ? [collectionId] : [],
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         numConnections: collectionId ? 1 : 0,
    //         remoteConnectedAt: block.remoteConnectedAt
    //           ? new Date(block.remoteConnectedAt)
    //           : undefined,
    //       }));
    //       if (!old) {
    //         return {
    //           pages: [
    //             { blocks: optimisticBlocks, nextId: 1, previousId: undefined },
    //           ],
    //           pageParams: [0],
    //         };
    //       }
    //       if ("pages" in old) {
    //         // format {"pageParams": [0], "pages": [{"blocks": [Array], "nextId": 1, "previousId": undefined}]}
    //         return {
    //           ...old,
    //           pages: old.pages.map((page, idx) =>
    //             idx > 0
    //               ? page
    //               : {
    //                   // @ts-ignore
    //                   blocks: [...optimisticBlocks, page.blocks],
    //                   ...page,
    //                 }
    //           ),
    //         };
    //       }

    //       return [...(old || []), ...optimisticBlocks];
    //     }
    //   );

    //   // Return a context object with the snapshotted value
    //   return { previousBlocks };
    // },
    onError: (_err, { collectionId }, context) => {
      queryClient.setQueryData(
        ["blocks", { collectionId }],
        context?.previousBlocks
      );
    },
  });
  const createBlocks = createBlocksMutation.mutateAsync;

  // Returns 1 if a block was created, 0 if not;
  const createBlock = async ({
    collectionsToConnect: connections,
    ...block
  }: BlockInsertInfo): Promise<{ blockId: string; created: boolean }> => {
    const [result] = await db.execAsync(
      [
        {
          sql: `
              INSERT INTO blocks (
                title,
                description,
                content,
                type,
                content_type,
                source,
                remote_source_type,
                created_by,
                remote_source_info,
                local_asset_id
              ) VALUES (
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  ?
              )
              ON CONFLICT(arena_id) DO NOTHING
              RETURNING *;`,
          args: [
            block.title || null,
            block.description || null,
            block.content,
            block.type,
            block.contentType,
            block.source || null,
            block.remoteSourceType || null,
            block.createdBy,
            block.remoteSourceInfo
              ? JSON.stringify(block.remoteSourceInfo)
              : null,
            block.localAssetId || null,
          ],
        },
      ],
      false
    );

    handleSqlErrors(result);

    let insertId = result.insertId;
    let blockCreated = Boolean(insertId);
    if (!insertId) {
      // means conflicted so find by arenaId
      const [result] = await db.execAsync(
        [
          {
            sql: `
              SELECT id FROM blocks WHERE arena_id = ?;`,
            args: [block.remoteSourceInfo?.arenaId.toString()],
          },
        ],
        true
      );
      handleSqlErrors(result);
      insertId = result.rows[0].id;
    }

    if (connections?.length) {
      await addConnections({
        blockId: String(insertId),
        connections,
      });
    }

    return { blockId: insertId!.toString(), created: blockCreated };
  };

  const deleteBlocksById = async (ids: string[], ignoreRemote?: boolean) => {
    const [result] = await db.execAsync(
      [
        {
          sql: inParam(`SELECT * from blocks where id IN (?#)`, ids),
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    const blocks = result.rows.map(mapDbBlockToBlock);
    return await deleteBlocks({ blocks, ignoreRemote });
  };

  const deleteBlocksBase = async ({
    blocks,
    ignoreRemote,
  }: {
    blocks: Block[];
    ignoreRemote?: boolean;
  }) => {
    const blockIds = blocks.map((block) => block.id);
    await db.transactionAsync(async (tx) => {
      await tx.executeSqlAsync(
        inParam(
          `UPDATE blocks SET deletion_timestamp = current_timestamp WHERE id IN (?#);`,
          blockIds
        )
      );

      if (!ignoreRemote) {
        void handleDeleteBlocksRemote(blocks);
      }
    });
  };
  const deleteBlocksMutation = useMutation({
    mutationFn: deleteBlocksBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
  const deleteBlocks = deleteBlocksMutation.mutateAsync;

  const handleDeleteBlocksRemote = async (blocks: Block[]) => {
    if (!isConnected) {
      return;
    }

    const localBlocks = blocks.filter(
      (block) => block.remoteSourceType === undefined
    );

    await deleteBlocksInternal(localBlocks);

    const remoteBlocks = blocks.filter(
      (block) => block.remoteSourceType !== undefined
    );

    const successfulDeletes = [];

    for (const block of remoteBlocks) {
      const connectionsForBlock = await getConnectionsForBlock(block.id, {
        filterRemoteOnly: true,
      });

      if (!connectionsForBlock.length) {
        successfulDeletes.push(block);
        continue;
      }

      switch (block.remoteSourceType) {
        case RemoteSourceType.Arena:
          if (!arenaAccessToken) {
            break;
          }
          const { arenaId: arenaBlockId } = block.remoteSourceInfo!;
          for (const connection of connectionsForBlock) {
            const { remoteSourceInfo } = connection;

            console.log(
              `removing block ${arenaBlockId} from channel ${
                remoteSourceInfo!.arenaId
              }`
            );
            try {
              await removeBlockFromChannel({
                blockId: arenaBlockId,
                channelId: remoteSourceInfo!.arenaId,
                arenaToken: arenaAccessToken,
              });
              successfulDeletes.push(block);
            } catch (err) {
              logError(err);
            }
          }
      }
    }
    await deleteBlocksInternal(successfulDeletes);
  };

  const deleteBlocksInternal = async (blocks: Block[]) => {
    const blockIds = blocks.map((block) => block.id);
    await db.transactionAsync(async (tx) => {
      await tx.executeSqlAsync(
        inParam(`DELETE FROM blocks WHERE id IN (?#);`, blockIds)
      );

      void Promise.all(
        blocks
          .filter(
            (block) =>
              FileBlockTypes.includes(block.type) &&
              block.content.startsWith(PHOTOS_FOLDER)
          )
          .map(async (block) =>
            FileSystem.deleteAsync(FileSystem.documentDirectory + block.content)
          )
      );

      await tx.executeSqlAsync(
        inParam(`DELETE FROM connections where block_id IN (?#);`, blockIds)
      );
    });
  };

  // TODO: handle ignoreRemote here, probably need another column if want to support restoring recently deleted
  const deleteBlock = async (id: string, ignoreRemote?: boolean) => {
    await deleteBlocksById([id], ignoreRemote);
  };

  const deleteCollectionBase = async (id: string) => {
    await db.transactionAsync(async (tx) => {
      await tx.executeSqlAsync(
        `
        DELETE FROM collections WHERE id = ?;`,
        [id]
      );
      await tx.executeSqlAsync(
        `
        DELETE FROM connections WHERE collection_id = ?;`,
        [id]
      );
    });
  };
  const deleteCollectionMutation = useMutation({
    mutationFn: deleteCollectionBase,
    onSuccess: (_res, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({
        queryKey: ["collection", { collectionId }],
      });
    },
  });
  const deleteCollection = deleteCollectionMutation.mutateAsync;

  const fullDeleteCollection = async (id: string) => {
    const collection = await getCollection(id);
    if (!collection) {
      return;
    }
    const blocks = await getCollectionItems(id, {
      whereClause: `num_connections = 1`,
    });

    await deleteBlocksInternal(blocks);
    await deleteCollection(id);
  };

  const createCollectionBase = async (collection: CollectionInsertInfo) => {
    const [result] = await db.execAsync(
      [
        {
          sql: `
        INSERT INTO collections (
            title,
            description,
            created_by,
            remote_source_type,
            remote_source_info
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
        );`,
          args: [
            collection.title,
            collection.description || null,
            collection.createdBy,
            collection.remoteSourceType || null,
            collection.remoteSourceInfo
              ? JSON.stringify(collection.remoteSourceInfo)
              : null,
          ],
        },
      ],
      false
    );

    handleSqlErrors(result);

    return result.insertId!.toString();
  };

  const createCollectionMutation = useMutation({
    mutationFn: createCollectionBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
  const createCollection = createCollectionMutation.mutateAsync;

  const SelectBlockSql = `WITH block_connections AS (
            SELECT    connections.block_id,
                      MIN(connections.remote_connected_at_datetime) AS remote_connected_at,
                      COUNT(connections.collection_id) as num_connections,
                      json_group_array(connections.collection_id) as collection_ids
            FROM      connections
            GROUP BY  1
          )
          SELECT    blocks.*,
                    block_connections.collection_ids as collection_ids,
                    COALESCE(block_connections.num_connections, 0) as num_connections,
                    block_connections.remote_connected_at as remote_connected_at
          FROM      blocks
          LEFT JOIN block_connections ON block_connections.block_id = blocks.id`; // coalesce to get around it being null..
  const SelectBlocksSortTypeToClause = (
    sortType: SortType,
    remoteConnectedAt: string,
    connectedAt: string,
    { seed }: { seed?: number } = {}
  ) => {
    ensure(
      sortType !== SortType.Random || seed !== undefined,
      "Random sort requires a seed"
    );
    switch (sortType) {
      case SortType.Created:
        return `ORDER BY  MIN(COALESCE(${remoteConnectedAt}, blocks.created_timestamp), blocks.created_timestamp) DESC`;
      case SortType.RemoteCreated:
        // NOTE: local timestamp are stored as HH:MM:SS and remote_created_at is ISO timestamp, so we convert it to local to compare.
        return `ORDER BY  CASE WHEN ${remoteConnectedAt} IS NOT NULL THEN ${remoteConnectedAt} ELSE COALESCE(${connectedAt}, blocks.created_timestamp) END DESC`;
      case SortType.Random:
        // TODO: lol this doesn't work bc sin isn't supported on ios..need to wait until expo supports custom sqlite extensions
        // return `ORDER BY  SIN(blocks.id + ${seed})`;
        return ``;
    }
  };
  const SelectBlocksSql = ({
    page = 0,
    // TODO:
    whereClause,
    sortType = SortType.Created,
    seed,
  }: GetBlocksOptions = {}) =>
    `${SelectBlockSql}
    WHERE deletion_timestamp IS NULL${whereClause ? ` AND ${whereClause}` : ""}
    ${SelectBlocksSortTypeToClause(
      sortType,
      "block_connections.remote_connected_at",
      "NULL",
      { seed }
    )}
    ${
      page === null
        ? ""
        : `LIMIT ${BlockSelectLimit} OFFSET ${page * BlockSelectLimit}`
    };`;

  async function getBlocks({
    page = 0,
    whereClause,
    sortType = SortType.Created,
    seed,
  }: GetBlocksOptions = {}): Promise<Block[]> {
    const [result] = await db.execAsync(
      [
        {
          sql: `${SelectBlocksSql({ page, sortType, seed, whereClause })};`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows.map((block) => mapDbBlockToBlock(block));
  }

  const SelectCollectionInfoSql = (
    whereClause?: string
  ) => `WITH block_connections AS (
              SELECT      id, 
                          content, 
                          collection_id, 
                          connections.created_timestamp as created_timestamp from blocks 
              LEFT JOIN   connections ON connections.block_id = blocks.id AND blocks.content != ''
              WHERE       blocks.type IN ('${BlockType.Image}', '${
    BlockType.Link
  }') AND blocks.deletion_timestamp IS NULL
          ),
          annotated_collections AS (SELECT DISTINCT
              collections.id,
              collections.title,
              collections.description,
              COALESCE(collections.thumbnail, FIRST_VALUE(block_connections.content) OVER (
                PARTITION BY collection_id
                ORDER BY block_connections.created_timestamp DESC
              )) as thumbnail,
              collections.remote_source_type,
              collections.remote_source_info,
              collections.created_timestamp,
              collections.updated_timestamp,
              collections.created_by
            FROM collections
            LEFT JOIN block_connections ON block_connections.collection_id = collections.id
            ${whereClause ? `WHERE ${whereClause}` : ""}
          )
          SELECT 
              annotated_collections.id,
              annotated_collections.title,
              annotated_collections.description,
              annotated_collections.thumbnail,
              annotated_collections.remote_source_type,
              annotated_collections.remote_source_info,
              annotated_collections.created_timestamp,
              annotated_collections.updated_timestamp,
              annotated_collections.created_by,
              MAX(connections.created_timestamp) as last_connected_at,
              COUNT(connections.block_id) as num_blocks
          FROM      annotated_collections
          LEFT JOIN connections ON annotated_collections.id = connections.collection_id
          GROUP BY 1,2,3,4,5,6,7`;

  const SelectCollectionsSortTypeToClause = (
    sortType: SortType,
    { seed }: { seed?: number } = {}
  ) => {
    ensure(
      sortType !== SortType.Random || seed !== undefined,
      "Random sort requires a seed"
    );
    switch (sortType) {
      case SortType.Created:
        return "ORDER BY  MAX(COALESCE(MAX(connections.created_timestamp), annotated_collections.updated_timestamp), annotated_collections.updated_timestamp) DESC";
      case SortType.RemoteCreated:
      case SortType.Random:
        // TODO: lol this doesn't work bc sin isn't supported on ios..need to wait until expo supports custom sqlite extensions
        // return `ORDER BY  SIN(annotated_collections.id + ${seed})`;
        return ``;
    }
  };
  const SelectCollectionsSql = ({
    page = 0,
    whereClause,
    sortType = SortType.Created,
    seed,
    search,
  }: GetCollectionsOptions = {}) => {
    let whereConditions = [];
    if (whereClause) {
      whereConditions.push(whereClause);
    }
    if (search) {
      const escapedSearch = getEscapedSearchString(search);
      whereConditions.push(
        `(collections.title LIKE ${escapedSearch} OR collections.description LIKE ${escapedSearch})`
      );
    }
    const compositeWhereClause = whereConditions.join(" AND ");

    return `
          ${SelectCollectionInfoSql(compositeWhereClause)}
          ${SelectCollectionsSortTypeToClause(sortType, { seed })}
          ${
            page === null
              ? ""
              : `LIMIT ${CollectionSelectLimit} OFFSET ${
                  page * CollectionSelectLimit
                }`
          };`;
  };

  async function getCollections({
    page,
    whereClause,
    sortType,
    seed,
    search,
  }: GetCollectionsOptions = {}): Promise<Collection[]> {
    try {
      const [result] = await db.execAsync(
        [
          {
            sql: `${SelectCollectionsSql({
              page,
              whereClause,
              sortType,
              seed,
              search,
            })};`,
            args: [],
          },
        ],
        true
      );
      handleSqlErrors(result);

      return result.rows.map((collection) => {
        return mapDbCollectionToCollection(collection);
      });
    } catch (err) {
      throw err;
    }
  }

  // TODO: genericize
  async function getArenaCollectionIds(
    remoteSourceType?: RemoteSourceType
  ): Promise<Set<string>> {
    const [result] = await db.execAsync(
      [
        !remoteSourceType
          ? {
              sql: `SELECT arena_id 
                    FROM collections 
                    WHERE collections.remote_source_type IS NOT NULL AND collections.arena_id IS NOT NULL;`,
              args: [remoteSourceType],
            }
          : {
              sql: `SELECT arena_id
                    FROM collections
                    WHERE collections.remote_source_type = ? AND collections.arena_id IS NOT NULL;`,
              args: [remoteSourceType],
            },
      ],
      true
    );
    handleSqlErrors(result);
    return new Set(
      result.rows.map((collection) => collection["arena_id"].toString())
    );
  }

  async function fetchBlock(blockId: string): Promise<Block> {
    const [result] = await db.execAsync(
      [
        {
          sql: `${SelectBlockSql}
          WHERE     blocks.id = ? AND blocks.deletion_timestamp IS NULL;`,
          args: [blockId.toString()],
        },
      ],
      true
    );
    handleSqlErrors(result);

    if (!result.rows.length) {
      throw Error(`Block ${blockId} not found!`);
    }

    return mapDbBlockToBlock(result.rows[0]);
  }

  async function fetchCollection(collectionId: string): Promise<Collection> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT * FROM ( ${SelectCollectionInfoSql()} ) AS collections
          WHERE     collections.id = ?;`,
          args: [collectionId],
        },
      ],
      true
    );
    handleSqlErrors(result);

    if (!result.rows.length) {
      throw Error(`Collection ${collectionId} not found!`);
    }

    return mapDbCollectionToCollection(result.rows[0]);
  }

  async function getCollection(collectionId: string) {
    return await fetchCollection(collectionId);
  }

  async function getBlock(blockId: string) {
    return await fetchBlock(blockId);
  }

  async function handleBlockRemoteUpdate(block: Block) {
    const blockUpdates = getPendingBlockUpdates();
    const updates = blockUpdates[block.id];
    let arenaBlock;

    if (!block.remoteSourceInfo) {
      removePendingBlockUpdate(block.id);
      return;
    }

    const { arenaId: arenaBlockId } = block.remoteSourceInfo;
    try {
      arenaBlock = await getArenaBlock(arenaBlockId, arenaAccessToken);
    } catch (err) {
      logError(err);
      if (
        typeof err === "string" &&
        (err.includes("404") || err.includes("401"))
      ) {
        removePendingBlockUpdate(block.id);
      }
    }

    if (arenaBlock) {
      try {
        const updated_at = new Date(arenaBlock.updated_at);
        // if updated timestamp > remoteupdated timestamp, then record it
        const remoteUpdates = [];
        const localUpdates = [];
        // ONLY TITLE AND DESCRIPTION ELIGIBLE
        const EligibleKeys = ["title", "description"] as const;
        for (const key of EligibleKeys) {
          if (key in updates) {
            const updatedTime = updates[key];
            if (updatedTime && updatedTime > updated_at.getTime()) {
              remoteUpdates.push([key, block[key]]);
            }
          }

          if (
            arenaBlock[key] &&
            arenaBlock[key] !== block[key] &&
            updated_at.getTime() > block.updatedAt.getTime()
          ) {
            localUpdates.push([key, arenaBlock[key]]);
          }
        }

        if (remoteUpdates.length > 0) {
          console.log("UPDATING REMOTE", remoteUpdates);
          await updateArenaBlock({
            blockId: arenaBlockId,
            arenaToken: arenaAccessToken,
            ...Object.fromEntries(remoteUpdates),
          });
        }

        if (localUpdates.length > 0) {
          console.log("UPDATING LOCAL", localUpdates);
          await updateBlock({
            blockId: block.id,
            editInfo: Object.fromEntries(localUpdates),
            ignoreRemoteUpdate: true,
          });
        }
        removePendingBlockUpdate(block.id);
      } catch (err) {
        if (typeof err === "string" && err.includes("401")) {
          // If unauthorized, remove the pending update
          removePendingBlockUpdate(block.id);
        }
        logError(err);
      }
    }
  }

  async function handleCollectionRemoteUpdate(collection: Collection) {
    const collectionUpdates = getPendingCollectionUpdates();
    const updates = collectionUpdates[collection.id];

    if (!collection.remoteSourceType || !collection.remoteSourceInfo) {
      removePendingCollectionUpdate(collection.id);
      return;
    }

    switch (collection.remoteSourceType) {
      case RemoteSourceType.Arena: {
        const { arenaId: arenaCollectionId } = collection.remoteSourceInfo;
        let arenaCollection;
        try {
          arenaCollection = await getChannelInfo(
            arenaCollectionId,
            arenaAccessToken
          );
        } catch (err) {
          logError(err);
          if (
            typeof err === "string" &&
            (err.includes("404") || err.includes("401"))
          ) {
            removePendingCollectionUpdate(collection.id);
          }
          return;
        }

        if (arenaCollection) {
          try {
            const updated_at = new Date(arenaCollection.updated_at);
            // if updated timestamp > remoteupdated timestamp, then record it
            const remoteUpdates = [];
            const localUpdates = [];
            // ONLY TITLE ELIGIBLE
            const EligibleKeys = ["title"] as const;
            for (const key of EligibleKeys) {
              if (key in updates) {
                const updatedTime = updates[key];
                if (updatedTime && updatedTime > updated_at.getTime()) {
                  remoteUpdates.push([key, collection[key]]);
                }
              }

              if (
                arenaCollection[key] &&
                arenaCollection[key] !== collection[key] &&
                updated_at.getTime() > collection.updatedAt.getTime()
              ) {
                localUpdates.push([key, arenaCollection[key]]);
              }
            }

            if (remoteUpdates.length > 0) {
              console.log("[CHANNEL] UPDATING REMOTE", remoteUpdates);
              await updateArenaChannel({
                channelId: arenaCollectionId,
                arenaToken: arenaAccessToken,
                ...Object.fromEntries(remoteUpdates),
              });
            }

            if (localUpdates.length > 0) {
              console.log("[CHANNEL] UPDATING LOCAL", localUpdates);
              await updateCollection({
                collectionId: collection.id,
                editInfo: Object.fromEntries(localUpdates),
                ignoreRemoteUpdate: true,
              });
            }
            removePendingCollectionUpdate(collection.id);
          } catch (err) {
            if (typeof err === "string" && err.includes("401")) {
              // If unauthorized, remove the pending update
              removePendingCollectionUpdate(collection.id);
            }
            logError(err);
          }
        }
        return;
      }
      default:
        ensureUnreachable(collection.remoteSourceType);
    }
  }

  async function updateBlockBase({
    blockId,
    editInfo,
    ignoreRemoteUpdate,
  }: {
    blockId: string;
    editInfo: BlockEditInfo;
    ignoreRemoteUpdate?: boolean;
  }): Promise<Block | undefined> {
    if (Object.keys(editInfo).length === 0) {
      return;
    }

    const entriesToEdit = Object.entries(editInfo);
    const [result] = await db.execAsync(
      [
        {
          sql: `
            UPDATE blocks SET 
            ${entriesToEdit
              .map(([key]) => `${camelCaseToSnakeCase(key)} = ?`)
              .join(", ")},
              updated_timestamp = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *;`,
          args: [
            ...entriesToEdit.map(([key, value]) => {
              if (key === "remoteSourceInfo") {
                return JSON.stringify(value);
              }
              return value;
            }),
            blockId,
          ],
        },
      ],
      false
    );

    handleSqlErrors(result);

    const newBlock = await getBlock(blockId);
    if (!ignoreRemoteUpdate) {
      recordPendingBlockUpdate(
        blockId,
        Object.keys(editInfo) as (keyof Block)[]
      );
      void handleBlockRemoteUpdate(newBlock);
    }
    return newBlock;
  }

  const updateBlockMutation = useMutation({
    mutationFn: updateBlockBase,
    onSuccess: (_data, { blockId }) => {
      // TODO: can probably make this more efficient.. but for now it needs to refresh.
      // just invalidate the specific block ID but
      // manually set query data if present of the other one
      queryClient.invalidateQueries({
        queryKey: ["blocks"],
      });
    },
    // onMutate: async ({ blockId, editInfo }) => {
    //   // Cancel any outgoing refetches
    //   // (so they don't overwrite our optimistic update)
    //   await queryClient.cancelQueries({
    //     queryKey: ["blocks"],
    //   });

    //   // Snapshot the previous value
    //   const previousBlocks = queryClient.getQueryData(["blocks"]);

    //   // Optimistically update to the new value
    //   queryClient.setQueryData<Block[]>(["blocks"], (old) =>
    //     old?.map((b) => (b.id === blockId ? { ...b, ...editInfo } : b))
    //   );

    //   // Return a context object with the snapshotted value
    //   return { previousBlocks };
    // },
    // onError: (_err, _data, context) => {
    //   queryClient.setQueryData(["blocks"], context?.previousBlocks);
    // },
  });
  const updateBlock = updateBlockMutation.mutateAsync;

  async function getCollectionItems(
    collectionId: string,
    {
      whereClause,
      page = 0,
      sortType = SortType.RemoteCreated,
      seed,
    }: GetBlocksOptions = {}
  ): Promise<CollectionBlock[]> {
    const [result] = await db.execAsync(
      [
        {
          // TODO: collapse this with the SelectBlocks, just with additional select and add whereClause as param
          sql: `
            WITH block_connections AS (
              SELECT    block_id,
                        json_group_array(connections.collection_id) as collection_ids,
                        COUNT(collection_id) as num_connections
              FROM      connections
              GROUP BY  1
            )
            SELECT      blocks.*,
                        block_connections.collection_ids as collection_ids,
                        connections.remote_created_at as remote_connected_at,
                        connections.created_timestamp as connected_at,
                        connections.created_by as connected_by,
                        COALESCE(block_connections.num_connections, 0) as num_connections
            FROM        blocks
            INNER JOIN  connections ON blocks.id = connections.block_id
            LEFT JOIN   block_connections ON blocks.id = block_connections.block_id
            WHERE       deletion_timestamp IS NULL AND connections.collection_id = ?${
              whereClause ? ` AND ${whereClause}` : ""
            }
            ${SelectBlocksSortTypeToClause(
              sortType,
              "connections.remote_connected_at_datetime",
              "connections.created_timestamp",
              {
                seed,
              }
            )}
            ${
              page === null
                ? ""
                : `LIMIT ${BlockSelectLimit} OFFSET ${page * BlockSelectLimit}`
            };`,
          args: [collectionId],
        },
      ],
      true
    );
    handleSqlErrors(result);

    // TODO: types
    return result.rows.map((block) => mapDbBlockToBlock(block));
  }

  async function updateCollectionBase({
    collectionId,
    editInfo,
    ignoreRemoteUpdate,
    noInvalidation,
  }: {
    collectionId: string;
    editInfo: CollectionEditInfo;
    ignoreRemoteUpdate?: boolean;
    noInvalidation?: boolean;
  }): Promise<Collection | undefined> {
    if (Object.keys(editInfo).length === 0) {
      return;
    }

    const entriesToEdit = Object.entries(editInfo);
    const [result] = await db.execAsync(
      [
        {
          sql: `
            UPDATE collections SET 
            ${entriesToEdit
              .map(([key]) => `${camelCaseToSnakeCase(key)} = ?`)
              .join(", ")},
              updated_timestamp = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *;`,
          args: [
            ...entriesToEdit.map(([key, value]) => {
              if (key === "remoteSourceInfo") {
                return JSON.stringify(value);
              }
              return value;
            }),
            collectionId,
          ],
        },
      ],
      false
    );

    handleSqlErrors(result);
    const newCollection = await getCollection(collectionId);
    if (!ignoreRemoteUpdate) {
      recordPendingCollectionUpdate(
        collectionId,
        Object.keys(editInfo) as (keyof Collection)[]
      );
      void handleCollectionRemoteUpdate(newCollection);
    }
    return newCollection;
  }

  const updateCollectionMutation = useMutation({
    mutationFn: updateCollectionBase,
    onSuccess: (newCollection, { collectionId, noInvalidation }) => {
      if (noInvalidation) {
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["collection", { collectionId }],
      });
      if (!newCollection) {
        return;
      }
      queryClient.setQueryData(["collections"], (old) => {
        if (!old) {
          return old;
        }
        if (!Array.isArray(old)) return old;

        return old.map((collection) => {
          if (collection.id === collectionId) {
            return newCollection;
          }
          return collection;
        });
      });
    },
  });
  const updateCollection = updateCollectionMutation.mutateAsync;

  // NOTE: this deliberately does not update remote sources because that is always handled
  // in the create block calls preceding this.
  async function addConnectionsToCollection({
    collectionId,
    blockConnections,
  }: {
    collectionId: string;
    blockConnections: InsertBlockConnection[];
  }) {
    await upsertConnections(
      blockConnections.map((c) => ({ ...c, collectionId }))
    );

    const collectionAddedTo = await getCollection(collectionId);
    if (
      !collectionAddedTo?.remoteSourceType ||
      !collectionAddedTo?.remoteSourceInfo
    ) {
      return;
    }
    void debouncedTriggerBlockSync();
  }

  // TODO: change this to return Connection type
  async function getPendingArenaConnections(): Promise<SQLite.ResultSet> {
    const [result] = await db.execAsync(
      [
        {
          // TODO: this query should be just arena when supporting other providers
          sql: `
          WITH block_connections AS (
                  SELECT    connections.block_id as block_id,
                            json_group_array(collections.id) as collection_ids,
                            json_group_array(collections.remote_source_type) as collection_remote_source_types,
                            json_group_array(collections.remote_source_info) as collection_remote_source_infos
                FROM        connections
                LEFT JOIN   collections ON connections.collection_id = collections.id 
                WHERE       collections.remote_source_type IS NOT NULL AND
                            collections.remote_source_info IS NOT NULL AND
                            connections.remote_created_at IS NULL
                GROUP BY    connections.block_id
          )
          SELECT      blocks.*, 
                      block_connections.collection_ids as collection_ids,
                      block_connections.collection_remote_source_types as collection_remote_source_types,
                      block_connections.collection_remote_source_infos as collection_remote_source_infos
          FROM        block_connections
          INNER JOIN  blocks ON blocks.id = block_connections.block_id;`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result as SQLite.ResultSet;
  }
  async function getPendingArenaBlocksToUpdate(): Promise<Block[]> {
    const blocksToUpdate = getPendingBlockUpdates();
    if (!Object.keys(blocksToUpdate).length) {
      return [];
    }

    const [result] = await db.execAsync(
      [
        {
          // TODO: this query should be just arena when supporting other providers
          sql: inParam(
            `SELECT  blocks.id, blocks.title, blocks.description, blocks.remote_source_type, blocks.remote_source_info, blocks.updated_timestamp
            FROM        blocks
            WHERE       blocks.id IN (?#) AND
                        blocks.deletion_timestamp IS NULL;`,
            Object.keys(blocksToUpdate)
          ),
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows.map(mapDbBlockToBlock);
  }
  async function getPendingArenaCollectionsToUpdate(): Promise<Collection[]> {
    const collectionsToUpdate = getPendingCollectionUpdates();
    if (!Object.keys(collectionsToUpdate).length) {
      return [];
    }

    const [result] = await db.execAsync(
      [
        {
          // TODO: this query should be just arena when supporting other providers
          sql: inParam(
            `SELECT  collections.id, collections.title, collections.description, collections.remote_source_type, collections.remote_source_info, collections.updated_timestamp
            FROM        collections
            WHERE       collections.id IN (?#);`,
            Object.keys(collectionsToUpdate)
          ),
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows.map(mapDbCollectionToCollection);
  }
  async function getPendingArenaBlocksToDelete(): Promise<Block[]> {
    const [result] = await db.execAsync(
      [
        {
          // TODO: this query should be just arena when supporting other providers
          sql: `SELECT  blocks.*
            FROM        blocks
            WHERE       blocks.remote_source_type IS NOT NULL AND
                        blocks.remote_source_info IS NOT NULL AND
                        blocks.deletion_timestamp IS NOT NULL;`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows.map(mapDbBlockToBlock);
  }
  async function getArenaCollections(): Promise<SQLite.ResultSet> {
    const [result] = await db.execAsync(
      [
        {
          // TODO: this query should be just arena when supporting other providers
          sql: `SELECT  *
            FROM        collections
            WHERE       collections.remote_source_type IS NOT NULL AND
                        collections.remote_source_info IS NOT NULL;`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result as SQLite.ResultSet;
  }

  async function syncWithArena() {
    try {
      await debouncedTriggerBlockSync();
      const { lastSyncedAt } = await getLastSyncedRemoteInfo();
      // if passed 6 hours, sync again
      if (
        !lastSyncedAt ||
        new Date().getTime() >
          new Date(lastSyncedAt).getTime() + 1000 * 60 * 60 * 6
      ) {
        await trySyncNewArenaBlocks();
      }
    } catch (err) {
      logError(err);
    }
  }

  async function trySyncNewArenaBlocks() {
    if (!arenaAccessToken) {
      return;
    }

    // return early if no internet
    if (!isConnected) {
      return;
    }

    InteractionManager.runAfterInteractions(async () => {
      try {
        const result = await getArenaCollections();
        const collectionsToSync = result.rows.map((collection) => ({
          ...mapDbCollectionToCollection(collection),
        }));
        for (const collectionToSync of collectionsToSync) {
          InteractionManager.runAfterInteractions(async () => {
            await syncNewRemoteItemsForCollection(collectionToSync);
          });
        }
      } finally {
        await updateLastSyncedRemoteInfo();
      }
    });
  }

  async function trySyncPendingArenaBlocks() {
    if (!arenaAccessToken) {
      return;
    }

    // return early if no internet
    if (!isConnected) {
      return;
    }

    InteractionManager.runAfterInteractions(async () => {
      const result = await getPendingArenaConnections();

      if (!result.rows.length) {
        return;
      }

      // @ts-ignore
      const connectionsToSync: BlockWithCollectionInfo[] = result.rows
        .map((block) => {
          const blockMappedToCamelCase =
            mapSnakeCaseToCamelCaseProperties(block);
          const mappedBlock = mapDbBlockToBlock(block);
          return {
            ...blockMappedToCamelCase,
            ...mappedBlock,
            collectionRemoteSourceTypes:
              blockMappedToCamelCase.collectionRemoteSourceTypes as RemoteSourceType[],
            collectionRemoteSourceInfos:
              blockMappedToCamelCase.collectionRemoteSourceInfos
                ? (JSON.parse(
                    blockMappedToCamelCase.collectionRemoteSourceInfos
                  ).map(
                    (info: string) => JSON.parse(info) as RemoteSourceInfo
                  ) as RemoteSourceInfo[])
                : null,
          } as BlockWithCollectionInfo;
        })
        .filter((b) => !queuedBlocksToSync.current.has(b.id));

      connectionsToSync.forEach((c) => queuedBlocksToSync.current.add(c.id));

      try {
        console.log(
          `Syncing ${connectionsToSync.length} pending connections to arena`
        );

        const succesfullySyncedConnections = [];

        for (const connToSync of connectionsToSync) {
          console.log("syncing", connToSync);
          const { collectionRemoteSourceInfos, collectionIds } = connToSync;
          const arenaCollectionInfo = collectionRemoteSourceInfos.map(
            (c, idx) => ({
              channelId: c.arenaId,
              collectionId: collectionIds[idx],
            })
          );
          const newRemoteItem = await syncBlockToArena(
            connToSync,
            arenaCollectionInfo
          );
          if (newRemoteItem) {
            succesfullySyncedConnections.push(connToSync);
          }
        }

        console.log(
          `Successfully synced ${succesfullySyncedConnections.map(
            (c) => `${c.id}-${c.collectionIds}`
          )} to arena. Failed to sync ${
            connectionsToSync.length - succesfullySyncedConnections.length
          }`
        );
      } catch (err) {
        logError(err);
      } finally {
        connectionsToSync.forEach((c) =>
          queuedBlocksToSync.current.delete(c.id)
        );
      }
    });
    InteractionManager.runAfterInteractions(async () => {
      const blocksToUpdate = await getPendingArenaBlocksToUpdate();
      console.log("[Arena Sync] Block Updates:", blocksToUpdate.length);
      for (const block of blocksToUpdate) {
        try {
          handleBlockRemoteUpdate(block);
        } catch (err) {
          logError(err);
        }
      }
      const collectionsToUpdate = await getPendingArenaCollectionsToUpdate();
      console.log(
        "[Arena Sync] Collection Updates:",
        collectionsToUpdate.length
      );
      for (const collection of collectionsToUpdate) {
        try {
          handleCollectionRemoteUpdate(collection);
        } catch (err) {
          logError(err);
        }
      }
    });
    InteractionManager.runAfterInteractions(async () => {
      const blocksToDelete = await getPendingArenaBlocksToDelete();
      console.log("[Arena Sync] Block Deletes:", blocksToDelete.length);
      try {
        handleDeleteBlocksRemote(blocksToDelete);
      } catch (err) {
        logError(err);
      }
    });
  }

  async function syncBlockToArena(
    block: Block,
    collectionInfos: ArenaCollectionInfo[]
  ): Promise<RawArenaBlock | undefined> {
    if (!arenaAccessToken) {
      return;
    }

    try {
      const channelIds = collectionInfos.map((c) => c.channelId);
      const { arenaBlock, connections } = await createBlockArena({
        channelIds,
        block,
        arenaToken: arenaAccessToken,
      });
      const { id: newBlockId, image } = arenaBlock;
      const hasUpdatedImage =
        block.type === BlockType.Link &&
        image?.display.url &&
        image.display.url !== block.content;
      // TODO: do these db updates in a transaction
      await db.execAsync(
        [
          {
            sql: `UPDATE blocks SET remote_source_type = ?, remote_source_info = ?${
              hasUpdatedImage ? `, content = ?` : ""
            } WHERE id = ?;`,
            args: [
              RemoteSourceType.Arena,
              JSON.stringify({
                arenaId: newBlockId.toString(),
                arenaClass: "Block",
              } as RemoteSourceInfo),
              ...(hasUpdatedImage ? [image.display.url] : []),
              block.id,
            ],
          },
        ],
        false
      );
      for (const collectionInfo of collectionInfos) {
        await upsertConnections([
          {
            blockId: block.id,
            collectionId: collectionInfo.collectionId,
            remoteCreatedAt: connections[collectionInfo.channelId].connected_at,
            createdBy: getCreatedByForRemote(
              RemoteSourceType.Arena,
              connections[collectionInfo.channelId].user.slug
            ),
          },
        ]);
      }
      queryClient.invalidateQueries({
        queryKey: ["blocks", { blockId: block.id }],
      });
      return arenaBlock;
    } catch (err) {
      logError(err);
    }
  }

  async function getLastRemoteItemForCollection(
    collectionId: string
  ): Promise<(Block & { remoteConnectedAt: string }) | null> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT  blocks.*,
                        connections.remote_created_at as remote_connected_at
            FROM        blocks
            INNER JOIN  connections ON connections.block_id = blocks.id AND connections.collection_id = ?
            LEFT JOIN   collections ON connections.collection_id = collections.id
            WHERE       collections.remote_source_type IS NOT NULL AND
                        collections.remote_source_info IS NOT NULL AND
                        connections.remote_created_at IS NOT NULL AND
                        blocks.deletion_timestamp IS NULL
            ORDER BY    blocks.created_timestamp DESC
            LIMIT       1`,
          args: [collectionId],
        },
      ],
      true
    );
    handleSqlErrors(result);

    // @ts-ignore
    return result.rows.map((block) => mapDbBlockToBlock(block))[0];
  }

  async function syncAllRemoteItems(collectionId: string) {
    const collection = await getCollection(collectionId);
    if (!collection.remoteSourceType || !collection.remoteSourceInfo) {
      return;
    }

    return syncNewRemoteItemsForCollection(collection, {
      ignoreLastSynced: true,
    });
  }

  async function syncNewRemoteItemsForCollection(
    collection: Collection,
    { ignoreLastSynced }: { ignoreLastSynced?: boolean } = {}
  ) {
    if (!collection.remoteSourceType || !collection.remoteSourceInfo) {
      return;
    }

    try {
      const {
        remoteSourceInfo,
        remoteSourceType,
        id: collectionId,
      } = collection;
      let itemsAdded = 0;
      let collectionUpdated = false;
      switch (remoteSourceType) {
        case RemoteSourceType.Arena:
          const { arenaId: channelId } = remoteSourceInfo;
          let lastSyncedInfo = null;
          if (!ignoreLastSynced) {
            lastSyncedInfo = await getLastSyncedInfoForChannel(channelId);
            if (!lastSyncedInfo) {
              const lastRemoteItem = await getLastRemoteItemForCollection(
                collectionId
              );
              if (lastRemoteItem?.remoteSourceInfo) {
                lastSyncedInfo = {
                  lastSyncedBlockCreatedAt: lastRemoteItem.remoteConnectedAt,
                  lastSyncedBlockId: lastRemoteItem.remoteSourceInfo.arenaId,
                  // TODO: this is wrong but i dont want to deal with types rn
                  lastSyncedAt: new Date().toISOString(),
                };
              }
            }
          }

          // TODO: a little ineficient bc this always fetches the 1st page of contents
          const channelInfo = await getChannelInfo(channelId, arenaAccessToken);
          console.log("Title:", channelInfo.title);
          console.log(channelInfo);
          if (channelInfo.title !== collection.title) {
            if (
              new Date(channelInfo.updated_at).getTime() >
              collection.updatedAt.getTime()
            ) {
              console.log(
                `Found different remote title, updating collection ${collectionId} title to ${channelInfo.title}`
              );
              await updateCollection({
                collectionId,
                editInfo: { title: channelInfo.title },
              });
              collectionUpdated = true;
            }
          }

          const lastContents = await getChannelItems(channelId, {
            accessToken: arenaAccessToken,
            lastSyncedInfo,
          });
          // These get returned in descending order of connected, so reverse it
          lastContents.reverse();
          // TODO: handle deletions so pass in a list of blockIds that are in the collection already
          console.log(
            `Found ${lastContents.length} new items from remote to add to ${collection.title}`
          );
          if (lastContents.length > 0) {
            console.log(
              "lastconnectedat",
              lastContents[lastContents.length - 1].connected_at
            );
            const blockInfos = await createBlocks({
              blocksToInsert: rawArenaBlocksToBlockInsertInfo(lastContents),
              collectionId,
            });
            itemsAdded = blockInfos.filter((b) => b.created).length;
            await updateLastSyncedInfoForChannel(channelId, {
              lastSyncedAt: new Date().toISOString(),
              lastSyncedBlockCreatedAt:
                lastContents[lastContents.length - 1]?.connected_at,
              lastSyncedBlockId: lastContents[lastContents.length - 1]?.id,
            });
          }
          break;
        default:
          throw new Error(
            `Remote source type ${collection.remoteSourceType} not supported`
          );
      }
      return {
        itemsAdded,
        collectionUpdated,
      };
    } catch (err) {
      logError(err);
    }
  }

  async function syncNewRemoteItems(collectionId: string) {
    const collection = await getCollection(collectionId);
    if (!collection.remoteSourceType || !collection.remoteSourceInfo) {
      return;
    }

    return syncNewRemoteItemsForCollection(collection);
  }

  async function addConnections({
    blockId,
    connections,
  }: Pick<ConnectionInsertInfo, "blockId"> & {
    connections: BlockConnectionInsertInfo[];
  }) {
    await upsertConnections(
      connections.map(({ collectionId, createdBy, remoteCreatedAt }) => ({
        collectionId,
        blockId,
        createdBy: createdBy || currentUser!.id,
        remoteCreatedAt,
      }))
    );
    InteractionManager.runAfterInteractions(async () => {
      await debouncedTriggerBlockSync();
    });
  }

  async function upsertConnectionsBase(connections: ConnectionInsertInfo[]) {
    const result = await db.execAsync(
      connections.map(
        ({ collectionId, blockId, remoteCreatedAt, createdBy }) => ({
          sql: `INSERT INTO connections (block_id, collection_id, created_by, remote_created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(block_id, collection_id) DO UPDATE SET remote_created_at = excluded.remote_created_at;`,
          args: [blockId, collectionId, createdBy, remoteCreatedAt || null],
        })
      ),
      false
    );
    handleSqlErrors(result);
  }
  const upsertConnectionsMutation = useMutation({
    mutationFn: upsertConnectionsBase,
    onSuccess: (_data, connections) => {
      const collectionIds = connections.map((c) => c.collectionId);
      // TODO: change numConnectiosn to separate query to just invalidate that
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      for (const collectionId of collectionIds) {
        queryClient.invalidateQueries({
          queryKey: ["blocks", { collectionId }],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({
        queryKey: ["blocks", { type: "uncategorized" }],
      });
    },
    onMutate: async (connections) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: ["blocks", { type: "uncategorized" }],
      });

      // Snapshot the previous value
      const previousUncategorizedBlocks = queryClient.getQueryData([
        "blocks",
        { type: "uncategorized" },
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData<Block[]>(
        ["blocks", { type: "uncategorized" }],
        (old) =>
          old?.filter((b) => !connections.map((c) => c.blockId).includes(b.id))
      );

      // Return a context object with the snapshotted value
      return { previousUncategorizedBlocks };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(
        ["blocks", { type: "uncategorized" }],
        context?.previousUncategorizedBlocks
      );
    },
  });
  const upsertConnections = upsertConnectionsMutation.mutateAsync;

  async function replaceConnections(blockId: string, collectionIds: string[]) {
    const [selectResult] = await db.execAsync(
      [
        {
          sql: inParam(
            `SELECT collection_id FROM connections WHERE block_id = ? AND collection_id NOT IN (?#);`,
            collectionIds
          ),
          args: [blockId],
        },
      ],
      true
    );
    handleSqlErrors(selectResult);

    const removedCollectionIds = selectResult.rows.map((r) => r.collection_id);
    const remoteCollectionsToRemoveConnection = await getCollections({
      page: null,
      whereClause: inParam(
        `collections.id IN (?#) AND collections.remote_source_type IS NOT NULL AND collections.remote_source_info IS NOT NULL`,
        removedCollectionIds
      ),
    });

    await db.transactionAsync(async (tx) => {
      const result = await db.execAsync(
        [
          {
            sql: inParam(
              `DELETE FROM connections WHERE block_id = ? AND collection_id NOT IN (?#);`,
              collectionIds
            ),
            args: [blockId],
          },
        ],
        false
      );
      handleSqlErrors(result);
      await addConnections({
        blockId,
        connections: collectionIds.map((collectionId) => ({
          collectionId,
          createdBy: currentUser!.id,
        })),
      });
    });

    // TODO: this is still kinda jank, need to do the same thing as with deleting a block.
    if (arenaAccessToken) {
      for (const collection of remoteCollectionsToRemoveConnection) {
        await removeBlockFromChannel({
          blockId,
          channelId: collection.remoteSourceInfo!.arenaId,
          arenaToken: arenaAccessToken,
        });
      }
    }
  }

  async function getConnectionsForBlock(
    blockId: string,
    { filterRemoteOnly }: { filterRemoteOnly?: boolean } = {}
  ): Promise<Connection[]> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT  connections.*,
                        collections.title,
                        collections.remote_source_type,
                        collections.remote_source_info
                FROM connections 
                INNER JOIN collections ON connections.collection_id = collections.id
                WHERE block_id = ?${
                  filterRemoteOnly
                    ? ` AND collections.remote_source_type IS NOT NULL AND connections.remote_created_at IS NOT NULL`
                    : ""
                };`,
          args: [blockId],
        },
      ],
      true
    );

    handleSqlErrors(result);

    return result.rows.map((connection) => ({
      ...mapSnakeCaseToCamelCaseProperties(connection),
      blockId: connection.block_id.toString(),
      collectionId: connection.collection_id.toString(),
      createdTimestamp: convertDbTimestampToDate(connection.created_timestamp)!,
      remoteCreatedAt: connection.remote_created_at
        ? new Date(connection.remote_created_at)
        : undefined,
      collectionTitle: connection.title,
      remoteSourceInfo: JSON.parse(connection.remote_source_info),
    }));
  }

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);

  async function tryImportArenaChannel(
    arenaChannel: string | ArenaChannelInfo,
    selectedCollection?: string
  ): Promise<ArenaImportInfo> {
    console.log(`importing ${JSON.stringify(arenaChannel)}`);
    const { title, id, contents, user, created_at } =
      typeof arenaChannel === "string"
        ? await getChannelInfoFromUrl(arenaChannel, arenaAccessToken)
        : arenaChannel;
    let collectionId = selectedCollection;
    const channelId = id.toString();
    if (!collectionId) {
      collectionId = await createCollection({
        title,
        createdBy: getCreatedByForRemote(RemoteSourceType.Arena, user.slug),
        remoteSourceType: RemoteSourceType.Arena,
        remoteSourceInfo: {
          arenaId: channelId,
          arenaClass: "Collection",
        },
      });
    }

    console.log(`found ${contents.length} items`);
    await createBlocks({
      blocksToInsert: rawArenaBlocksToBlockInsertInfo(contents),
      collectionId: collectionId!,
    });
    await updateLastSyncedInfoForChannel(channelId, {
      lastSyncedAt: new Date().toISOString(),
      lastSyncedBlockCreatedAt: contents[contents.length - 1]?.connected_at,
      lastSyncedBlockId: contents[contents.length - 1]?.id,
    });
    return { title, size: contents.length };
  }

  return (
    <DatabaseContext.Provider
      value={{
        createBlocks,
        // localBlocks: useMemo(() => {
        //   // only ignore those imported (not directly texted in app)
        //   // this works because adding to arena is done post connection when not importing
        //   return !blocks
        //     ? null
        //     : blocks.filter(
        //         (b) =>
        //           !b.remoteConnectedAt ||
        //           b.remoteConnectedAt.getTime() > b.createdAt.getTime()
        //       );
        // }, [blocks]),
        getBlock,
        updateBlock,
        deleteBlock,
        setShareIntent,
        shareIntent,
        getConnectionsForBlock,
        createCollection,
        updateCollection,
        getCollection,
        getArenaCollectionIds,
        addConnections,
        replaceConnections,
        upsertConnections,
        deleteCollection,
        fullDeleteCollection,
        getCollectionItems,
        syncNewRemoteItems,
        syncAllRemoteItems,
        syncBlockToArena,
        tryImportArenaChannel,
        selectedReviewCollection: selectedReviewCollection?.toString() || null,
        setSelectedReviewCollection,
        getBlocks,
        getCollections,
        // internal
        db,
        initDatabases,
        trySyncPendingArenaBlocks,
        getPendingArenaBlocks: getPendingArenaConnections,
        trySyncNewArenaBlocks,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useBlockConnections(blockId: string) {
  const { getConnectionsForBlock } = useContext(DatabaseContext);
  return useQuery({
    queryKey: ["connections", { blockId }],
    queryFn: async () => {
      return await getConnectionsForBlock(blockId);
    },
  });
}

export function useTotalBlockCount() {
  const { db } = useContext(DatabaseContext);

  async function getBlockCount(): Promise<number> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT COUNT(*) as count FROM blocks WHERE blocks.deletion_timestamp IS NULL;`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows[0].count;
  }
  return useQuery({
    queryKey: ["blocks", "count"],
    queryFn: getBlockCount,
  });
}

export function useTotalCollectionCount() {
  const { db } = useContext(DatabaseContext);

  async function getCollectionCount(): Promise<number> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT COUNT(*) as count FROM collections;`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows[0].count;
  }
  return useQuery({
    queryKey: ["collections", "count"],
    queryFn: getCollectionCount,
  });
}

export function useTotalConnectionCount() {
  const { db } = useContext(DatabaseContext);

  async function getConnectionCount(): Promise<number> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT COUNT(*) as count FROM connections;`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);
    return result.rows[0].count;
  }
  return useQuery({
    queryKey: ["connections", "count"],
    queryFn: getConnectionCount,
  });
}

export function useUncategorizedBlocks() {
  const { db } = useContext(DatabaseContext);

  return useQuery({
    queryKey: ["blocks", { type: "uncategorized" }],
    queryFn: async () => {
      const [events] = await db.execAsync(
        [
          {
            sql: `
        SELECT * FROM (
        SELECT  blocks.id,
                blocks.content,
                blocks.title,
                blocks.type,
                blocks.source,
                blocks.created_timestamp,
                COUNT(connections.collection_id) AS num_connections
        FROM blocks
        LEFT JOIN connections ON connections.block_id = blocks.id
        WHERE blocks.deletion_timestamp IS NULL
        GROUP BY 1,2,3,4,5,6) AS c
        WHERE c.num_connections = 0
        ORDER BY c.created_timestamp DESC;`,
            // TODO: add this after migrating table
            // WHERE user_id = ?
            args: [],
          },
        ],
        true
      );

      handleSqlErrors(events);

      const newEvents = events.rows.map((event) => {
        const mapped = mapSnakeCaseToCamelCaseProperties(event);
        return {
          ...mapped,
          content: mapBlockContentToPath(mapped.content, mapped.type),
          createdAt: convertDbTimestampToDate(mapped.createdTimestamp),
        } as Block;
      });
      return newEvents;
    },
  });
}

export function useCollections({
  searchValue,
  selectedCollectionId,
}: {
  searchValue?: string;
  selectedCollectionId?: string;
}) {
  const { getCollections, getCollection } = useContext(DatabaseContext);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const debouncedSearch = useDebounceValue(searchValue, 300);

  // TODO: toast the error
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["collections", { search: debouncedSearch }],
    queryFn: async ({ pageParam: page, queryKey }) => {
      const [_, { search }] = queryKey;

      const collections = await getCollections({
        page,
        search: search as string,
      });
      return {
        collections,
        nextId: collections.length < CollectionSelectLimit ? null : page + 1,
        previousId: page === 0 ? null : page - 1,
      };
    },
    initialPageParam: 0,
    // TODO:
    getPreviousPageParam: (firstPage) => firstPage?.previousId ?? undefined,
    getNextPageParam: (lastPage) => lastPage?.nextId ?? undefined,
  });

  const collections = useMemo(
    () => data?.pages.flatMap((p) => p.collections),
    [data]
  );

  useEffect(() => {
    if (!selectedCollectionId) {
      setSelectedCollection(null);
      return;
    }
    void (async () => {
      setSelectedCollection(await getCollection(selectedCollectionId));
    })();
  }, [selectedCollectionId]);

  // NOTE: kinda jank because if it's not present in first page, it will disappear when it comes in a later page.. but
  // feels a little better than always having it be on top? idk
  const showSelectedCollection = useMemo(() => {
    return selectedCollectionId &&
      !collections?.some((c) => c.id === selectedCollectionId)
      ? true
      : false;
  }, [selectedCollectionId, collections]);

  const allCollections = useMemo(() => {
    return [
      ...(showSelectedCollection && selectedCollection
        ? [selectedCollection]
        : []),
      ...(collections || []),
    ];
  }, [collections, selectedCollection, showSelectedCollection]);

  const fetchMoreCollections = useCallback(() => {
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }

    fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const debouncedFetchMoreCollections = useDebounce(fetchMoreCollections, 300);

  return {
    collections: allCollections,
    isLoading,
    debouncedFetchMoreCollections,
    isFetchingNextPage,
  };
}

export function useCollection(collectionId: string) {
  const { getCollection } = useContext(DatabaseContext);

  return useQuery({
    queryKey: ["collection", { collectionId }],
    queryFn: async () => {
      return await getCollection(collectionId);
    },
  });
}
export function useBlock(blockId: string) {
  const { getBlock } = useContext(DatabaseContext);

  return useQuery({
    queryKey: ["blocks", { blockId }],
    queryFn: async () => {
      return await getBlock(blockId);
    },
  });
}
