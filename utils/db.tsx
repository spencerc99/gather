import { InteractionManager, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  InfiniteData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { ErrorsContext } from "./errors";
import { getBlock as getArenaBlock, recordPendingBlockUpdate } from "./arena";
import {
  PropsWithChildren,
  createContext,
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
  ArenaTokenStorageKey,
  RawArenaChannelItem,
  addBlockToChannel,
  arenaClassToBlockType,
  arenaClassToMimeType,
  getChannelContents,
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
  DatabaseBlockInsert,
  InsertBlockConnection,
  RemoteSourceInfo,
  RemoteSourceType,
  SortType,
} from "./dataTypes";
import { convertDbTimestampToDate } from "./date";
import { Indices, Migrations, migrateCreatedBy } from "./db/migrations";
import { BlockType, FileBlockTypes } from "./mimeTypes";
import { UserContext, getCreatedByForRemote } from "./user";
import { filterItemsBySearchValue } from "./search";
import { ensure } from "./react";

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

export function mapDbBlockToBlock(block: any): Block {
  const blockMappedToCamelCase = mapSnakeCaseToCamelCaseProperties(block);
  return {
    ...blockMappedToCamelCase,
    // TODO: resolve schema so you dont have to do this because its leading to a lot of confusing errors downstraem from types
    id: block.id.toString(),
    content: mapBlockContentToPath(block.content, block.type),
    // TODO: probably just make these null too
    description: block.description === null ? undefined : block.description,
    title: block.title === null ? undefined : block.title,
    source: block.source === null ? undefined : block.source,
    createdAt: convertDbTimestampToDate(block.created_timestamp),
    updatedAt: convertDbTimestampToDate(block.updated_timestamp),
    remoteConnectedAt: block.remote_connected_at
      ? new Date(block.remote_connected_at)
      : undefined,
    remoteSourceType:
      (block.remote_source_type as RemoteSourceType) || undefined,
    remoteSourceInfo: block.remote_source_info
      ? (JSON.parse(block.remote_source_info) as RemoteSourceInfo)
      : undefined,
    collectionIds: block.collection_ids
      ? JSON.parse(block.collection_ids).map((c: number | string) =>
          c.toString()
        )
      : [],
  } as Block;
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
}
type GetCollectionsOptions = GetBlocksOptions;

interface DatabaseContextProps {
  getBlocks: (opts?: GetBlocksOptions) => Promise<Block[]>;
  // localBlocks: Block[] | null;
  createBlocks: (blocks: BlocksInsertInfo) => Promise<string[]>;
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
  }) => Promise<void>;
  getCollectionItems: (
    collectionId: string,
    options?: GetBlocksOptions
  ) => Promise<CollectionBlock[]>;
  syncNewRemoteItems: (collectionId: string) => Promise<void>;
  syncBlockToArena: (
    channelId: string,
    block: Block,
    collectionId: string
  ) => Promise<RawArenaChannelItem | undefined>;
  getCollection: (collectionId: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  fullDeleteCollection: (id: string) => Promise<void>;

  addConnections(
    blockId: string,
    collectionIds: string[],
    createdBy: string
  ): Promise<void>;
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
  updateCollection: async () => {},
  getCollection: async () => {
    throw new Error("not yet loaded");
  },
  deleteCollection: async () => {},
  fullDeleteCollection: async () => {},
  getCollectionItems: async () => [],
  syncNewRemoteItems: async () => {},
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

export function mapSnakeCaseToCamelCaseProperties<
  T extends { [column: string]: any }
>(obj: { [column: string]: any }): T {
  const newObj = {};
  for (const key in obj) {
    const newKey = key.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace("-", "").replace("_", "");
    });
    // if (typeof T[newKey] === typeof Date) {
    //   // @ts-ignore
    //   newObj[newKey] = convertDbTimestampToDate(obj[key]);
    //   continue;
    // }

    // @ts-ignore
    newObj[newKey] = obj[key];
  }
  // @ts-ignore
  return newObj;
}

export function mapBlockContentToPath(
  rawBlockContent: string,
  rawBlockType: BlockType
): string {
  if (
    ![
      BlockType.Image,
      BlockType.Link,
      BlockType.Audio,
      BlockType.Document,
      BlockType.Video,
    ].includes(rawBlockType)
  ) {
    return rawBlockContent;
  }

  return rawBlockContent.startsWith(PHOTOS_FOLDER)
    ? FileSystem.documentDirectory + rawBlockContent
    : rawBlockContent;
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

  const [isConnected, setIsConnected] = useState<boolean>(true);
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
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // TODO: change this to only when you go to the collection? or only for most recent collections? i think this is freezing up the app on start
    if (currentUser) {
      // TODO: remove after migration
      void migrateCreatedBy(db, currentUser);
    }
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
  
              PRIMARY KEY (block_id, collection_id),
              FOREIGN KEY (block_id) REFERENCES blocks(id),
              FOREIGN KEY (collection_id) REFERENCES collections(id)
          );`
        );

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
  }: BlocksInsertInfo): Promise<string[]> => {
    // TODO: change to use insertBlocks
    const blockIds = await Promise.all(
      blocksToInsert.map(async (block) => createBlock(block))
    );

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
    return blockIds;
  };

  const createBlocksMutation = useMutation({
    mutationFn: createBlocksBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });
  const createBlocks = createBlocksMutation.mutateAsync;

  const createBlock = async ({
    collectionsToConnect: connections,
    ...block
  }: BlockInsertInfo): Promise<string> => {
    console.log("inserting with asset id", block.localAssetId);
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
      console.log("insert id not found", insertId);
    }

    if (connections?.length) {
      await addConnections(String(insertId), connections, block.createdBy);
    }

    return insertId!.toString();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
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
                      MIN(connections.remote_created_at) AS remote_connected_at,
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
    { seed }: { seed?: number } = {}
  ) => {
    ensure(
      sortType !== SortType.Random || seed !== undefined,
      "Random sort requires a seed"
    );
    switch (sortType) {
      case SortType.Created:
        return `ORDER BY  MIN(COALESCE(${remoteConnectedAt}, blocks.created_timestamp), blocks.created_timestamp) DESC`;
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
          ${whereClause ? `WHERE ${whereClause}` : ""}
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
  }: GetCollectionsOptions = {}) => `
          ${SelectCollectionInfoSql(whereClause)}
          ${SelectCollectionsSortTypeToClause(sortType, { seed })}
          ${
            page === null
              ? ""
              : `LIMIT ${CollectionSelectLimit} OFFSET ${
                  page * CollectionSelectLimit
                }`
          };`;

  async function getCollections({
    page,
    whereClause,
    sortType,
    seed,
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
      return;
    }

    const { arenaId: arenaBlockId } = block.remoteSourceInfo;
    try {
      arenaBlock = await getArenaBlock(arenaBlockId, arenaAccessToken);
    } catch (err) {
      logError(err);
      // TODO: only skip if 404
      removePendingBlockUpdate(block.id);
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
        logError(err);
      }
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
      sortType = SortType.Created,
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
              "connections.remote_created_at",
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
  }: {
    collectionId: string;
    editInfo: CollectionEditInfo;
  }): Promise<void> {
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
    // return mapDbCollectionToCollection(result.rows[0]);
  }

  const updateCollectionMutation = useMutation({
    mutationFn: updateCollectionBase,
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({
        queryKey: ["collections", { collectionId }],
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
          sql: `SELECT  blocks.*, 
                        collections.id as collection_id, collections.remote_source_type as collection_remote_source_type, collections.remote_source_info as collection_remote_source_info
            FROM        connections
            INNER JOIN  blocks ON blocks.id = connections.block_id
            LEFT JOIN   collections ON connections.collection_id = collections.id 
            WHERE       collections.remote_source_type IS NOT NULL AND
                        collections.remote_source_info IS NOT NULL AND
                        connections.remote_created_at IS NULL;`,
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
            collectionRemoteSourceType:
              blockMappedToCamelCase.collectionRemoteSourceType as RemoteSourceType,
            collectionRemoteSourceInfo:
              blockMappedToCamelCase.collectionRemoteSourceInfo
                ? (JSON.parse(
                    blockMappedToCamelCase.collectionRemoteSourceInfo
                  ) as RemoteSourceInfo)
                : null,
            collectionId: block.collection_id,
          };
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
          const newRemoteItem = await syncBlockToArena(
            connToSync.collectionRemoteSourceInfo!.arenaId!,
            connToSync,
            connToSync.collectionId
          );
          if (newRemoteItem) {
            succesfullySyncedConnections.push(connToSync);
          }
        }

        console.log(
          `Successfully synced ${succesfullySyncedConnections.map(
            (c) => `${c.id}-${c.collectionId}`
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
    channelId: string,
    block: Block,
    collectionId: string
  ): Promise<RawArenaChannelItem | undefined> {
    if (!arenaAccessToken) {
      return;
    }

    try {
      const rawArenaItem = await addBlockToChannel({
        channelId,
        block,
        arenaToken: arenaAccessToken,
      });
      const { id: newBlockId, image } = rawArenaItem;
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
                arenaId: newBlockId,
                arenaClass: "Block",
              } as RemoteSourceInfo),
              ...(hasUpdatedImage ? [image.display.url] : []),
              block.id,
            ],
          },
        ],
        false
      );
      await upsertConnections([
        {
          blockId: block.id,
          collectionId: collectionId,
          remoteCreatedAt: rawArenaItem.connected_at,
          createdBy: block.createdBy,
        },
      ]);
      queryClient.invalidateQueries({
        queryKey: ["blocks", { blockId: block.id }],
      });
      return rawArenaItem;
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

  function rawArenaBlocksToBlockInsertInfo(
    arenaBlocks: RawArenaChannelItem[]
  ): DatabaseBlockInsert[] {
    return arenaBlocks.map((block) => ({
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
      createdBy: getCreatedByForRemote(RemoteSourceType.Arena, block.user.slug),
      remoteSourceType: RemoteSourceType.Arena,
      remoteSourceInfo: {
        arenaId: block.id,
        arenaClass: "Block",
      },
      remoteConnectedAt: block.connected_at,
      connectedBy: getCreatedByForRemote(
        RemoteSourceType.Arena,
        block.connected_by_user_slug
      ),
    }));
  }

  async function syncNewRemoteItemsForCollection(collection: Collection) {
    if (!collection.remoteSourceType || !collection.remoteSourceInfo) {
      return;
    }

    const { remoteSourceInfo, remoteSourceType, id: collectionId } = collection;

    switch (remoteSourceType) {
      case RemoteSourceType.Arena:
        const { arenaId: channelId } = remoteSourceInfo;
        let lastSyncedInfo = await getLastSyncedInfoForChannel(channelId);
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

        // TODO: a little ineficient bc this always fetches the 1st page of contents
        const channelInfo = await getChannelInfo(channelId, arenaAccessToken);
        // TODO: this could get a little out of sync if we allow editing the title on our end and arena doesn't update properly
        // so it needs to take into account the updatedAt timestamp to be fully safe.
        console.log("Title:", channelInfo.title);
        if (channelInfo.title !== collection.title) {
          console.log(
            `Found different remote title, updating collection ${collectionId} title to ${channelInfo.title}`
          );
          await updateCollection({
            collectionId,
            editInfo: { title: channelInfo.title },
          });
        }

        const lastContents = await getChannelContents(channelId, {
          accessToken: arenaAccessToken,
          lastSyncedInfo,
        });
        // TODO: handle deletions so pass in a list of blockIds that are in the collection already
        console.log(
          `Found ${lastContents.length} new items from remote to add to ${collection.title}`
        );
        if (lastContents.length > 0) {
          console.log(
            "lastconnectedat",
            lastContents[lastContents.length - 1].connected_at
          );
          await createBlocks({
            blocksToInsert: rawArenaBlocksToBlockInsertInfo(lastContents),
            collectionId,
          });
          await updateLastSyncedInfoForChannel(channelId, {
            lastSyncedAt: new Date().toISOString(),
            lastSyncedBlockCreatedAt:
              lastContents[lastContents.length - 1].connected_at,
            lastSyncedBlockId: lastContents[lastContents.length - 1].id,
          });
        }
        break;
      default:
        throw new Error(
          `Remote source type ${collection.remoteSourceType} not supported`
        );
    }
  }

  async function syncNewRemoteItems(collectionId: string) {
    const collection = await getCollection(collectionId);
    if (!collection.remoteSourceType || !collection.remoteSourceInfo) {
      return;
    }

    return syncNewRemoteItemsForCollection(collection);
  }

  async function addConnections(
    blockId: string,
    collectionIds: string[],
    createdBy: string
  ) {
    await upsertConnections(
      collectionIds.map((collectionId) => ({
        collectionId,
        blockId,
        createdBy,
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
        `annotated_collections.id IN (?#) AND annotated_collections.remote_source_type IS NOT NULL AND annotated_collections.remote_source_info IS NOT NULL`,
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
      await addConnections(blockId, collectionIds, currentUser!.id);
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
          sql: `SELECT  connections.block_id, 
                        connections.collection_id, 
                        connections.created_timestamp, 
                        connections.created_by, 
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
    const { title, id, contents, user } =
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
      lastSyncedBlockCreatedAt: contents[contents.length - 1].connected_at,
      lastSyncedBlockId: contents[contents.length - 1].id,
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
        syncBlockToArena,
        tryImportArenaChannel,
        selectedReviewCollection,
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

export function useCollections(searchValue?: string) {
  const { getCollections } = useContext(DatabaseContext);
  const debouncedSearch = useDebounceValue(searchValue, 300);

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      return await getCollections({ page: null });
    },
  });

  const filteredCollections = useMemo(
    () =>
      !debouncedSearch
        ? collections
        : filterItemsBySearchValue(collections || [], debouncedSearch, [
            "title",
            "description",
          ]),
    [collections, debouncedSearch]
  );

  return {
    collections: filteredCollections,
    isLoading,
  };
}

export function useCollection(collectionId: string) {
  const { getCollection } = useContext(DatabaseContext);

  return useQuery({
    queryKey: ["collections", { collectionId }],
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
