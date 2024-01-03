import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BlockType, FileBlockTypes } from "./mimeTypes";
import { ShareIntent } from "../hooks/useShareIntent";
import {
  ArenaImportInfo,
  BlockEditInfo,
  BlockWithCollectionInfo,
  Collection,
  CollectionBlock,
  CollectionEditInfo,
  CollectionInsertInfo,
  Connection,
  ConnectionInsertInfo,
  InsertBlockConnection,
  LastSyncedInfo,
  RemoteSourceInfo,
  RemoteSourceType,
} from "./dataTypes";
import { UserContext } from "./user";
import { convertDbTimestampToDate } from "./date";
import { PHOTOS_FOLDER, intializeFilesystemFolder } from "./blobs";
import {
  ArenaChannelInfo,
  ArenaTokenStorageKey,
  RawArenaItem,
  addBlockToChannel,
  arenaClassToBlockType,
  arenaClassToMimeType,
  getChannelContents,
  getChannelInfo,
  getChannelInfoFromUrl,
  removeBlockFromChannel,
} from "./arena";
import { Block } from "./dataTypes";
import {
  BlockInsertInfo,
  BlocksInsertInfo,
  DatabaseBlockInsert,
} from "./dataTypes";
import {
  getLastSyncedInfoForChannel,
  getLastSyncedRemoteInfo,
  updateLastSyncedInfoForChannel,
  updateLastSyncedRemoteInfo,
} from "./asyncStorage";
import { Indices, Migrations } from "./db/migrations";

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

function mapDbBlockToBlock(block: any): Block {
  const blockMappedToCamelCase = mapSnakeCaseToCamelCaseProperties(block);
  return {
    ...blockMappedToCamelCase,
    // TODO: resolve schema so you dont have to do this because its leading to a lot of confusing errors downstraem from types
    id: block.id.toString(),
    content: mapBlockContentToPath(block.content, block.type),
    createdAt: convertDbTimestampToDate(block.created_timestamp),
    updatedAt: convertDbTimestampToDate(block.updated_timestamp),
    remoteSourceType: block.remote_source_type as RemoteSourceType,
    remoteSourceInfo: block.remote_source_info
      ? (JSON.parse(block.remote_source_info) as RemoteSourceInfo)
      : null,
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

interface DatabaseContextProps {
  blocks: Block[];
  localBlocks: Block[];
  createBlock: (block: BlockInsertInfo) => Promise<string>;
  createBlocks: (blocks: BlocksInsertInfo) => Promise<string[]>;
  getBlock: (blockId: string) => Promise<Block>;
  updateBlock: (blockId: string, editInfo: BlockEditInfo) => Promise<void>;
  deleteBlock: (id: string) => void;

  getConnectionsForBlock: (blockId: string) => Promise<Connection[]>;

  collections: Collection[];
  createCollection: (collection: CollectionInsertInfo) => Promise<string>;
  updateCollection: (
    collectionId: string,
    editInfo: CollectionEditInfo
  ) => Promise<void>;
  getCollectionItems: (collectionId: string) => Promise<CollectionBlock[]>;
  syncNewRemoteItems: (collectionId: string) => Promise<void>;
  getCollection: (collectionId: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  fullDeleteCollection: (id: string) => Promise<void>;

  addConnections(blockId: string, collectionIds: string[]): Promise<void>;
  replaceConnections(blockId: string, collectionIds: string[]): Promise<void>;

  // share intent
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;

  // arena
  arenaAccessToken: string | null;
  updateArenaAccessToken: (newToken: string | null) => void;
  tryImportArenaChannel: (
    arenaChannel: string | ArenaChannelInfo,
    selectedCollection?: string
  ) => Promise<ArenaImportInfo>;

  // internal
  db: SQLite.SQLiteDatabase;
  initDatabases: () => Promise<void>;
  fetchBlocks: () => void;
  fetchCollections: () => void;
  trySyncPendingArenaBlocks: () => void;
  trySyncNewArenaBlocks: () => void;
  getPendingArenaBlocks: () => any;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  blocks: [],
  localBlocks: [],
  createBlock: async () => {
    throw new Error("not yet loaded");
  },
  createBlocks: async () => {
    throw new Error("not yet loaded");
  },
  getBlock: async () => {
    throw new Error("not yet loaded");
  },
  updateBlock: async () => {},
  deleteBlock: () => {},

  getConnectionsForBlock: async () => [],

  collections: [],
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

  addConnections: async () => {},
  replaceConnections: async () => {},

  setShareIntent: () => {},
  shareIntent: null,

  arenaAccessToken: null,
  updateArenaAccessToken: () => {},
  tryImportArenaChannel: async () => {
    throw new Error("not yet loaded");
  },

  db,
  initDatabases: async () => {},
  fetchBlocks: () => {},
  fetchCollections: () => {},
  trySyncPendingArenaBlocks: () => {},
  trySyncNewArenaBlocks: () => {},
  getPendingArenaBlocks: () => {},
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
  const { currentUser } = useContext(UserContext);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [arenaAccessToken, setArenaAccessToken] = useState<string | null>(null);

  useEffect(() => {
    void initDatabases();
    void intializeFilesystemFolder();
    void getArenaAccessToken().then((accessToken) => {
      setArenaAccessToken(accessToken);
    });
  }, []);

  useEffect(() => {
    // TODO: change this to only when you go to the collection? or only for most recent collections? i think this is freezing up the app on start
    if (!currentUser || !arenaAccessToken) {
      return;
    }
    void syncWithArena();
  }, [arenaAccessToken, currentUser]);

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
              source TEXT,
              remote_source_type varchar(128),
              remote_source_info blob,
              created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
              remote_source_info blob 
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
        console.error(err);
      }
    }, false);
    fetchBlocks();
    fetchCollections();
  }

  async function insertBlocks(blocksToInsert: DatabaseBlockInsert[]) {
    await db.transactionAsync(async (tx) => {
      const insertChunks = chunkArray(blocksToInsert, BlockInsertChunkSize);
      for (const chunk of insertChunks) {
        const result = await tx.executeSqlAsync(
          `
        INSERT INTO blocks (
            title,
            description,
            content,
            type,
            content_type,
            source,
            remote_source_type,
            created_by,
            remote_source_info
        ) VALUES ${chunk
          .map(
            (c) => `(
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )`
          )
          .join(",\n")}
        RETURNING *;`,
          // @ts-ignore
          [
            ...chunk.flatMap((block) => [
              // @ts-ignore expo sqlite types are broken
              block.title || null,
              // @ts-ignore expo sqlite types are broken
              block.description || null,
              block.content,
              block.type,
              block.contentType,
              // @ts-ignore expo sqlite types are broken
              block.source || null,
              // @ts-ignore expo sqlite types are broken
              block.remoteSourceType || null,
              block.createdBy,
              // @ts-ignore expo sqlite types are broken
              block.remoteSourceInfo
                ? JSON.stringify(block.remoteSourceInfo)
                : null,
            ]),
          ]
        );
        handleSqlErrors(result);
        // TODO: figure out how to get the ids from all of the inserts.
      }
    });
  }

  const createBlocks = async ({
    blocksToInsert,
    collectionId,
  }: BlocksInsertInfo): Promise<string[]> => {
    // TODO: change to use insertBlocks
    const blockIds = await Promise.all(
      blocksToInsert.map(async (block) => createBlock(block, true))
    );
    fetchBlocks();

    if (collectionId) {
      const blockConnections = blockIds.map((blockId, idx) => ({
        blockId: blockId,
        // TODO: this is kinda jank, should really be using directly from arena item
        // but because we are doing the logic to extract that into this its effectively
        // the same info
        remoteCreatedAt: blocksToInsert[idx].remoteConnectedAt,
      }));
      await addConnectionsToCollection(collectionId, blockConnections);
    }
    return blockIds;
  };

  const createBlock = async (
    { collectionsToConnect: connections, ...block }: BlockInsertInfo,
    ignoreFetch?: boolean
  ): Promise<string> => {
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
                remote_source_info
              ) VALUES (
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
              RETURNING id;`,
          args: [
            // @ts-ignore expo sqlite types are broken
            block.title || null,
            // @ts-ignore expo sqlite types are broken
            block.description || null,
            block.content,
            block.type,
            block.contentType,
            // @ts-ignore expo sqlite types are broken
            block.source || null,
            // @ts-ignore expo sqlite types are broken
            block.remoteSourceType || null,
            block.createdBy,
            // @ts-ignore expo sqlite types are broken
            block.remoteSourceInfo
              ? JSON.stringify(block.remoteSourceInfo)
              : null,
            block.remoteSourceInfo?.arenaId || null,
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

    // TODO: change this to just fetch the new row info
    if (!ignoreFetch) {
      console.log("refetching");
      fetchBlocks();
    }

    if (connections?.length) {
      await addConnections(String(insertId), connections);
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
    return await deleteBlocks(blocks, ignoreRemote);
  };

  const deleteBlocks = async (blocks: Block[], ignoreRemote?: boolean) => {
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

      if (!ignoreRemote) {
        // TODO: void this. Requires setting deletion timestamp and then deferring on deleting until remote is confirmed gone.
        await handleDeleteBlocksRemote(blocks);
      }

      await tx.executeSqlAsync(
        inParam(`DELETE FROM connections where block_id IN (?#);`, blockIds)
      );
    });
    fetchBlocks();
    // TODO: this is only because we rely on items count for each collection and its cached
    fetchCollections();
  };

  // TODO: this should really just be a separate thing that sweeps up any things to delete
  const handleDeleteBlocksRemote = async (blocks: Block[]) => {
    const remoteBlocks = blocks.filter(
      (block) => block.remoteSourceType !== undefined
    );

    for (const block of remoteBlocks) {
      const connectionsForBlock = await getConnectionsForBlock(block.id, {
        filterRemoteOnly: true,
      });

      switch (block.remoteSourceType) {
        case RemoteSourceType.Arena:
          if (!arenaAccessToken) {
            break;
          }
          const { arenaId: arenaBlockId } = block.remoteSourceInfo!;
          for (const connection of connectionsForBlock) {
            const { remoteSourceInfo } = connection;

            // TODO: this doens't work if you are offline...
            await removeBlockFromChannel({
              blockId: arenaBlockId,
              channelId: remoteSourceInfo!.arenaId,
              arenaToken: arenaAccessToken,
            });
          }
      }
    }
  };

  const deleteBlock = async (id: string, ignoreRemote?: boolean) => {
    console.log("DELETING");
    await deleteBlocksById([id], ignoreRemote);
  };

  const deleteCollection = async (id: string) => {
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
    setCollections(collections.filter((collection) => collection.id !== id));
  };

  const fullDeleteCollection = async (id: string) => {
    const collection = await getCollection(id);
    if (!collection) {
      return;
    }
    const blocks = await getCollectionItems(id, {
      whereClause: `num_connections = 1`,
    });

    await deleteBlocks(blocks, true);
    await deleteCollection(id);
  };

  const createCollection = async (collection: CollectionInsertInfo) => {
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
            // @ts-ignore expo sqlite types are broken
            collection.description || null,
            collection.createdBy,
            collection.remoteSourceType || null,
            // @ts-ignore expo sqlite types are broken
            collection.remoteSourceInfo
              ? JSON.stringify(collection.remoteSourceInfo)
              : null,
          ],
        },
      ],
      false
    );

    handleSqlErrors(result);

    fetchCollections();

    return result.insertId!.toString();
  };
  const SelectBlockSql = `WITH block_connections AS (
            SELECT    connections.block_id,
                      COUNT(connections.collection_id) as num_connections
            FROM      connections
            GROUP BY  1
          )
          SELECT    blocks.*,
                    COALESCE(block_connections.num_connections, 0) as num_connections
          FROM      blocks
          LEFT JOIN block_connections ON block_connections.block_id = blocks.id`;

  function fetchBlocks() {
    db.transaction((tx) => {
      tx.executeSql(
        `${SelectBlockSql};`,
        [],
        (_, { rows: { _array } }) => {
          setBlocks(_array.map((block) => mapDbBlockToBlock(block)));
        },
        (err) => {
          throw err;
        }
      );
    });
  }
  const SelectCollectionInfoSql = `WITH block_connections AS (
              SELECT      id, 
                          content, 
                          collection_id, 
                          connections.created_timestamp as created_timestamp from blocks 
              LEFT JOIN   connections ON connections.block_id = blocks.id
              WHERE       blocks.type IN ('${BlockType.Image}', '${BlockType.Link}')
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
          GROUP BY 1,2,3,4,5,6,7`;

  function fetchCollections() {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `${SelectCollectionInfoSql};`,
          [],
          (_, { rows: { _array } }) => {
            setCollections([
              ..._array.map((collection) => {
                return mapDbCollectionToCollection(collection);
              }),
            ]);
          }
        );
      },
      (err) => {
        throw err;
      }
    );
  }

  async function fetchBlock(blockId: string): Promise<Block> {
    const [result] = await db.execAsync(
      [
        {
          sql: `${SelectBlockSql}
          WHERE     blocks.id = ?;`,
          args: [blockId],
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
          sql: `${SelectCollectionInfoSql}
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
    let maybeCollection = collections.find(
      (collection) => collection.id.toString() === collectionId.toString()
    );
    if (!maybeCollection) {
      maybeCollection = await fetchCollection(collectionId);
    }
    return maybeCollection;
  }

  async function getBlock(blockId: string) {
    let maybeBlock = blocks.find(
      (block) => block.id.toString() === blockId.toString()
    );
    if (!maybeBlock) {
      maybeBlock = await fetchBlock(blockId);
    }
    return maybeBlock;
  }

  async function updateBlock(
    blockId: string,
    editInfo: BlockEditInfo
  ): Promise<void> {
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

    // TODO: handle remote update

    setBlocks(
      blocks.map((b) =>
        b.id !== blockId ? b : { ...b, ...mapDbBlockToBlock(result.rows[0]) }
      )
    );
  }

  async function getCollectionItems(
    collectionId: string,
    { whereClause }: { whereClause?: string; havingClause?: string } = {}
  ): Promise<CollectionBlock[]> {
    const [result] = await db.execAsync(
      [
        {
          sql: `
            WITH block_connections AS (
              SELECT    block_id,
                        COUNT(collection_id) as num_connections
              FROM      connections
              GROUP BY  1
            )
            SELECT      blocks.*,
                        connections.remote_created_at as remote_connected_at,
                        COALESCE(block_connections.num_connections, 0) as num_connections
            FROM        blocks
            INNER JOIN  connections ON blocks.id = connections.block_id
            LEFT JOIN   block_connections ON blocks.id = block_connections.block_id
            WHERE       connections.collection_id = ?${
              whereClause ? ` AND ${whereClause}` : ""
            };`,
          args: [collectionId],
        },
      ],
      true
    );
    handleSqlErrors(result);

    return result.rows.map((block) => mapDbBlockToBlock(block));
  }

  async function updateCollection(
    collectionId: string,
    editInfo: CollectionEditInfo
  ): Promise<void> {
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

    setCollections(
      collections.map((c) =>
        c.id !== collectionId
          ? c
          : { ...c, ...mapDbCollectionToCollection(result.rows[0]) }
      )
    );
  }

  // NOTE: this deliberately does not update remote sources because that is always handled
  // in the create block calls preceding this.
  async function addConnectionsToCollection(
    collectionId: string,
    blockConnections: InsertBlockConnection[]
  ) {
    const result = await db.execAsync(
      blockConnections.map(({ blockId, remoteCreatedAt }) => ({
        sql: `INSERT INTO connections (block_id, collection_id, created_by, remote_created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(block_id, collection_id) DO NOTHING;`,
        args: [blockId, collectionId, currentUser!.id, remoteCreatedAt || null],
      })),
      false
    );

    handleSqlErrors(result);

    // setCollections(
    //   collections.map((c) => {
    //     if (collectionId === c.id) {
    //       return {
    //         ...c,
    //         lastConnectedAt: new Date(),
    //       };
    //     }
    //     return c;
    //   })
    // );
    void fetchCollections();

    const collectionAddedTo = collections.find((c) => c.id === collectionId);
    if (
      !collectionAddedTo?.remoteSourceType ||
      !collectionAddedTo?.remoteSourceInfo
    ) {
      return;
    }
    void trySyncPendingArenaBlocks();
  }

  async function getArenaAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ArenaTokenStorageKey);
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
      await trySyncPendingArenaBlocks();
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
      console.error(err);
    }
  }

  async function trySyncNewArenaBlocks() {
    if (!arenaAccessToken) {
      return;
    }

    const result = await getArenaCollections();
    const collectionsToSync = result.rows.map((collection) => ({
      ...mapDbCollectionToCollection(collection),
    }));

    try {
      for (const collectionToSync of collectionsToSync) {
        await syncNewRemoteItemsForCollection(collectionToSync);
      }
    } catch (err) {
      console.error(err);
    } finally {
      await updateLastSyncedRemoteInfo();
    }
  }

  async function trySyncPendingArenaBlocks() {
    if (!arenaAccessToken) {
      return;
    }

    const result = await getPendingArenaConnections();

    if (!result.rows.length) {
      return;
    }

    // @ts-ignore
    const connectionsToSync: BlockWithCollectionInfo[] = result.rows.map(
      (block) => {
        const blockMappedToCamelCase = mapSnakeCaseToCamelCaseProperties(block);
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
      }
    );

    console.log(
      `Syncing ${connectionsToSync.length} pending connections to arena`
    );

    const blockCollectionIdToRemoteConnectedAt: Record<
      string,
      string | undefined
    > = {};
    for (const connToSync of connectionsToSync) {
      const newRemoteItem = await syncBlockToArena(
        connToSync.collectionRemoteSourceInfo!.arenaId!,
        connToSync
      );
      if (newRemoteItem) {
        blockCollectionIdToRemoteConnectedAt[
          `${connToSync.id}-${connToSync.collectionId}`
        ] = newRemoteItem.connected_at;
      }
    }

    const succesfullySyncedConnections = connectionsToSync.filter(
      (conn) =>
        blockCollectionIdToRemoteConnectedAt[`${conn.id}-${conn.collectionId}`]
    );
    if (succesfullySyncedConnections.length === 0) {
      return;
    }

    await upsertConnections(
      succesfullySyncedConnections.map((conn) => ({
        blockId: conn.id,
        collectionId: conn.collectionId,
        remoteCreatedAt:
          blockCollectionIdToRemoteConnectedAt[
            `${conn.id}-${conn.collectionId}`
          ],
      }))
    );

    console.log(
      `Successfully synced ${connectionsToSync
        .filter(
          (conn) =>
            blockCollectionIdToRemoteConnectedAt[
              `${conn.id}-${conn.collectionId}`
            ]
        )
        .map((c) => `${c.id}-${c.collectionId}`)} to arena`
    );
  }

  async function syncBlockToArena(
    channelId: string,
    block: Block
  ): Promise<RawArenaItem | undefined> {
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
        block.type === BlockType.Link && image?.display.url;
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
      return rawArenaItem;
    } catch (err) {
      console.error(err);
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
                        connections.remote_created_at IS NOT NULL
            ORDER BY    blocks.created_timestamp DESC
            LIMIT       1`,
          args: [collectionId],
        },
      ],
      true
    );
    handleSqlErrors(result);

    return result.rows.map((block) => mapDbBlockToBlock(block))[0];
  }

  function rawArenaBlocksToBlockInsertInfo(
    arenaBlocks: RawArenaItem[]
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
      createdBy: currentUser!.id,
      remoteSourceType: RemoteSourceType.Arena,
      remoteSourceInfo: {
        arenaId: block.id,
        arenaClass: "Block",
      },
      remoteConnectedAt: block.connected_at,
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
          await updateCollection(collectionId, { title: channelInfo.title });
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
          await fetchBlocks();
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

  async function addConnections(blockId: string, collectionIds: string[]) {
    await upsertConnections(
      collectionIds.map((collectionId) => ({
        collectionId,
        blockId,
      }))
    );
    void fetchCollections();
    void trySyncPendingArenaBlocks();
  }

  async function upsertConnections(connections: ConnectionInsertInfo[]) {
    const result = await db.execAsync(
      connections.map(({ collectionId, blockId, remoteCreatedAt }) => ({
        sql: `INSERT INTO connections (block_id, collection_id, created_by, remote_created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(block_id, collection_id) DO UPDATE SET remote_created_at = excluded.remote_created_at;`,
        args: [blockId, collectionId, currentUser!.id, remoteCreatedAt || null],
      })),
      false
    );
    handleSqlErrors(result);
  }

  async function replaceConnections(blockId: string, collectionIds: string[]) {
    await addConnections(blockId, collectionIds);

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
    const remoteCollectionsToRemoveConnection = collections.filter(
      (c) =>
        removedCollectionIds.includes(c.id) &&
        c.remoteSourceType &&
        c.remoteSourceInfo
    );

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

    await fetchCollections();
    await fetchBlocks();
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

  async function updateArenaAccessToken(newToken: string | null) {
    // TODO: handle web
    if (Platform.OS !== "web") {
      if (newToken === null) {
        await SecureStore.deleteItemAsync(ArenaTokenStorageKey);
      } else {
        await SecureStore.setItemAsync(ArenaTokenStorageKey, newToken);
      }
    }
    setArenaAccessToken(newToken);
  }

  async function tryImportArenaChannel(
    arenaChannel: string,
    selectedCollection?: string
  ): Promise<ArenaImportInfo> {
    console.log(`importing ${JSON.stringify(arenaChannel)}`);
    const { title, id, contents } =
      typeof arenaChannel === "string"
        ? await getChannelInfoFromUrl(arenaChannel, arenaAccessToken)
        : arenaChannel;
    let collectionId = selectedCollection;
    const channelId = id.toString();
    if (!collectionId) {
      collectionId = await createCollection({
        title,
        createdBy: currentUser!.id,
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
        createBlock,
        createBlocks,
        blocks,
        localBlocks: useMemo(() => {
          return blocks.filter((b) => b.remoteSourceType === null);
        }, [blocks]),
        getBlock,
        updateBlock,
        deleteBlock,
        setShareIntent,
        shareIntent,
        getConnectionsForBlock,
        collections,
        createCollection,
        updateCollection,
        getCollection,
        addConnections,
        replaceConnections,
        deleteCollection,
        fullDeleteCollection,
        getCollectionItems,
        syncNewRemoteItems,
        arenaAccessToken,
        updateArenaAccessToken,
        tryImportArenaChannel,
        // internal
        db,
        initDatabases,
        fetchBlocks,
        fetchCollections,
        trySyncPendingArenaBlocks,
        getPendingArenaBlocks: getPendingArenaConnections,
        trySyncNewArenaBlocks,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
