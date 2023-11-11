import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import {
  PropsWithChildren,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BlockType, FileBlockTypes, MimeType } from "./mimeTypes";
import { ShareIntent } from "../hooks/useShareIntent";
import {
  ArenaChannelBlockInfo,
  Collection,
  CollectionInsertInfo,
  Connection,
  RemoteSourceInfo,
  RemoteSourceType,
} from "./dataTypes";
import { currentUser } from "./user";
import { convertDbTimestampToDate } from "./date";
import { PHOTOS_FOLDER, intializeFilesystemFolder } from "./blobs";
import { ArenaTokenStorageKey, addBlockToChannel } from "./arena";

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

interface DatabaseBlockInsert {
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

interface BlockInsertInfo extends DatabaseBlockInsert {
  collectionsToConnect?: string[]; // IDs of collections that this block is in
}

export interface BlocksInsertInfo {
  blocksToInsert: DatabaseBlockInsert[];
  collectionId?: string;
}

export interface Block extends Omit<BlockInsertInfo, "connections"> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
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
  deleteBlock: (id: string) => void;

  getConnectionsForBlock: (blockId: string) => Promise<Connection[]>;

  collections: Collection[];
  createCollection: (collection: CollectionInsertInfo) => Promise<string>;
  getCollectionItems: (collectionId: string) => Promise<Block[]>;
  getCollection: (collectionId: string) => Promise<Collection>;
  deleteCollection: (id: string) => void;

  addConnections(blockId: string, collectionIds: string[]): Promise<void>;
  replaceConnections(blockId: string, collectionIds: string[]): Promise<void>;

  // share intent
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;

  // arena
  arenaAccessToken: string | null;
  updateArenaAccessToken: (newToken: string | null) => void;

  // TODO: remove this once apis solidify
  db: SQLite.SQLiteDatabase;
  initDatabases: () => Promise<void>;
  fetchBlocks: () => void;
  fetchCollections: () => void;
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
  deleteBlock: () => {},

  getConnectionsForBlock: async () => [],

  collections: [],
  createCollection: async () => {
    throw new Error("not yet loaded");
  },
  getCollection: async () => {
    throw new Error("not yet loaded");
  },
  deleteCollection: () => {},
  getCollectionItems: async () => [],

  addConnections: async () => {},
  replaceConnections: async () => {},

  setShareIntent: () => {},
  shareIntent: null,

  arenaAccessToken: null,
  updateArenaAccessToken: () => {},

  db,
  initDatabases: async () => {},
  fetchBlocks: () => {},
  fetchCollections: () => {},
});

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
): results is SQLite.ResultSet {
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
  return true;
}

export function DatabaseProvider({ children }: PropsWithChildren<{}>) {
  useEffect(() => {
    void initDatabases();
  }, []);

  async function initDatabases() {
    await db.transactionAsync(async (tx) => {
      // Set up tables
      // TODO: figure out id scheme
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
            created_by TEXT NOT NULL
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

            PRIMARY KEY (block_id, collection_id),
            FOREIGN KEY (block_id) REFERENCES blocks(id),
            FOREIGN KEY (collection_id) REFERENCES collections(id)
        );`
      );

      await fetchBlocks();
      await fetchCollections();
    });
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
        if ("error" in result) {
          throw result.error;
        }
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
      await addConnectionsToCollection(collectionId, blockIds);
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
            RETURNING *;`,
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
          ],
        },
      ],
      false
    );

    if ("error" in result) {
      throw result.error;
    }

    if (connections?.length) {
      await addConnections(String(result.insertId!), connections);
    }

    // TODO: change this to just fetch the new row info
    if (!ignoreFetch) {
      fetchBlocks();
    }

    return result.insertId!.toString();
  };

  const deleteBlock = async (id: string) => {
    // TODO: get the image path and delete it from the local filesystem too
    await db.transactionAsync(async (tx) => {
      await tx.executeSqlAsync(`DELETE FROM blocks WHERE id = ?;`, [id]);
      await tx.executeSqlAsync(`DELETE FROM connections where block_id = ?;`, [
        id,
      ]);
      const deletedBlock = blocks.find((block) => block.id === id);
      if (
        deletedBlock &&
        FileBlockTypes.includes(deletedBlock.type) &&
        deletedBlock.content.startsWith(PHOTOS_FOLDER)
      ) {
        await FileSystem.deleteAsync(
          FileSystem.documentDirectory + deletedBlock.content
        );
      }

      setBlocks(blocks.filter((block) => block.id !== id));
      // TODO: this is only because we rely on items count for each collection and its cached
      fetchCollections();
    });
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
      setCollections(collections.filter((collection) => collection.id !== id));
    });
  };

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [arenaAccessToken, setArenaAccessToken] = useState<string | null>(null);

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

    if ("error" in result) {
      throw result.error;
    }

    fetchCollections();

    return result.insertId!.toString();
  };

  function fetchBlocks() {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM blocks;`,
        [],
        (_, { rows: { _array } }) => {
          setBlocks(
            _array.map((block) => {
              const blockMappedToCamelCase =
                mapSnakeCaseToCamelCaseProperties(block);
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
            })
          );
        },
        (err) => {
          throw err;
        }
      );
    });
  }

  function fetchCollections() {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `WITH block_connections AS (
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
          GROUP BY 1,2,3,4,5,6,7;`,
          [],
          (_, { rows: { _array } }) => {
            setCollections([
              ..._array.map((collection) => {
                const mappedCollection =
                  mapSnakeCaseToCamelCaseProperties(collection);
                // @ts-ignore
                return {
                  ...mappedCollection,
                  // TODO: resolve schema so you dont have to do this because its leading to a lot of confusing errors downstraem from types
                  id: collection.id.toString(),
                  createdAt: convertDbTimestampToDate(
                    collection.created_timestamp
                  ),
                  updatedAt: convertDbTimestampToDate(
                    collection.updated_timestamp
                  ),
                  createdBy: collection.created_by,
                  lastConnectedAt: convertDbTimestampToDate(
                    collection.last_connected_at
                  ),
                  remoteSourceType:
                    mappedCollection.remoteSourceType as RemoteSourceType,
                  remoteSourceInfo: mappedCollection.remoteSourceInfo
                    ? (JSON.parse(
                        mappedCollection.remoteSourceInfo
                      ) as RemoteSourceInfo)
                    : null,
                  // TODO: add collaborators
                  collaborators: ["spencer-did"],
                } as Collection;
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

  async function getCollection(collectionId: string) {
    const maybeCollection = collections.find(
      (collection) => collection.id.toString() === collectionId.toString()
    );
    if (!maybeCollection) {
      throw new Error(
        `Collection ${collectionId} not found! Only have ${collections.map(
          (c) => c.id
        )}`
      );
    }
    return maybeCollection;
  }

  async function getBlock(blockId: string) {
    const maybeBlock = blocks.find(
      (block) => block.id.toString() === blockId.toString()
    );
    if (!maybeBlock) {
      throw new Error(`Block ${blockId} not found!`);
    }
    return maybeBlock;
  }

  async function getCollectionItems(collectionId: string): Promise<Block[]> {
    const [result] = await db.execAsync(
      [
        {
          sql: `
        SELECT * FROM blocks
        INNER JOIN connections ON blocks.id = connections.block_id
        WHERE connections.collection_id = ?;`,
          args: [collectionId],
        },
      ],
      true
    );
    if ("error" in result) {
      throw result.error;
    }

    return result.rows.map(
      (block) =>
        ({
          ...block,
          createdAt: convertDbTimestampToDate(block.created_timestamp),
          updatedAt: convertDbTimestampToDate(block.updated_timestamp),
          createdBy: block.created_by,
          remoteSourceType: block.remote_source_type as RemoteSourceType,
          remoteSourceInfo: block.remote_source_info
            ? (JSON.parse(block.remote_source_info) as RemoteSourceInfo)
            : null,
        } as Block)
    );
  }

  async function addConnectionsToCollection(
    collectionId: string,
    blockIds: string[]
  ) {
    const result = await db.execAsync(
      blockIds.map((blockId) => ({
        sql: `INSERT INTO connections (block_id, collection_id, created_by)
              VALUES (?, ?, ?)
              ON CONFLICT(block_id, collection_id) DO NOTHING;`,
        args: [blockId, collectionId, currentUser().id],
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

    // TODO: if collectionId has remoteSource, then sync to remote source
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

  async function trySyncPendingArenaBlocks() {
    // TODO: make this work for every provider
    if (!arenaAccessToken) {
      return;
    }

    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT  blocks.*, 
                        collections.id as collection_id, collections.remote_source_type as collection_remote_source_type, collections.remote_source_info as collection_remote_source_info
            FROM        blocks
            INNER JOIN  connections ON connections.block_id = blocks.id
            LEFT JOIN   collections ON connections.collection_id = collections.id
            WHERE       collections.remote_source_type IS NOT NULL AND
                        collections.remote_source_info IS NOT NULL AND
                        blocks.remote_source_type IS NULL`,
          args: [],
        },
      ],
      true
    );
    handleSqlErrors(result);

    const blocksToSync = await Promise.all(
      (result as SQLite.ResultSet).rows.map(async (block) => {
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
          collectionRemoteSourceType:
            blockMappedToCamelCase.collectionRemoteSourceType as RemoteSourceType,
          collectionRemoteSourceInfo:
            blockMappedToCamelCase.collectionRemoteSourceInfo
              ? (JSON.parse(
                  blockMappedToCamelCase.collectionRemoteSourceInfo
                ) as RemoteSourceInfo)
              : null,
        };
      })
    );

    for (const blockToSync of blocksToSync) {
      await syncBlockToArena(
        blockToSync.collectionRemoteSourceInfo!.arenaId!,
        // @ts-ignore
        blockToSync as Block,
        arenaToken
      );
    }
  }

  async function syncBlockToArena(
    channelId: string,
    block: Block,
    arenaToken: string
  ) {
    try {
      const newBlockId = await addBlockToChannel({
        channelId,
        block,
        arenaToken,
      });
      await db.execAsync(
        [
          {
            sql: "UPDATE blocks SET remote_source_type = ?, remote_source_info = ? WHERE id = ?;",
            args: [
              RemoteSourceType.Arena,
              JSON.stringify({
                arenaId: newBlockId,
                arenaClass: "Block",
                connectedAt: new Date().toISOString(),
              } as RemoteSourceInfo),
              block.id,
            ],
          },
        ],
        false
      );
    } catch (err) {}
  }

  async function addConnections(blockId: string, collectionIds: string[]) {
    const result = await db.execAsync(
      collectionIds.map((collectionId) => ({
        sql: `INSERT INTO connections (block_id, collection_id, created_by)
              VALUES (?, ?, ?)
              ON CONFLICT(block_id, collection_id) DO NOTHING;`,
        args: [blockId, collectionId, currentUser().id],
      })),
      false
    );

    handleSqlErrors(result);

    void fetchCollections();

    if (
      collections.some(
        (c) =>
          collectionIds.includes(c.id) &&
          c.remoteSourceType &&
          c.remoteSourceInfo
      )
    ) {
      void trySyncPendingArenaBlocks();
    }
  }

  async function replaceConnections(blockId: string, collectionIds: string[]) {
    const result = await db.execAsync(
      [
        // TODO: make this into a single query for perf, just stack the values manually
        ...collectionIds.map((collectionId) => ({
          sql: `INSERT INTO connections (block_id, collection_id, created_by)
              VALUES (?, ?, ?)
              ON CONFLICT(block_id, collection_id) DO NOTHING;`,
          args: [blockId, collectionId, currentUser().id],
        })),
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

    await fetchCollections();
  }

  async function getConnectionsForBlock(
    blockId: string
  ): Promise<Connection[]> {
    const [result] = await db.execAsync(
      [
        {
          sql: `SELECT  connections.block_id, 
                        connections.collection_id, 
                        connections.created_timestamp, 
                        connections.created_by, 
                        collections.title
                FROM connections 
                INNER JOIN collections ON connections.collection_id = collections.id
                WHERE block_id = ?`,
          args: [blockId],
        },
      ],
      true
    );

    // TODO: have handleSqlERrors properly handle the type here
    if ("error" in result) {
      throw result.error;
    }

    return result.rows.map((connection) => ({
      ...mapSnakeCaseToCamelCaseProperties(connection),
      blockId: connection.block_id.toString(),
      collectionId: connection.collection_id.toString(),
      createdTimestamp: convertDbTimestampToDate(connection.created_timestamp)!,
      collectionTitle: connection.title,
    }));
  }

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);

  useEffect(() => {
    void fetchBlocks();
    void fetchCollections();
    void intializeFilesystemFolder();
    void getArenaAccessToken().then((accessToken) => {
      setArenaAccessToken(accessToken);
      void trySyncPendingArenaBlocks();
    });
  }, []);

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
        deleteBlock,
        setShareIntent,
        shareIntent,
        getConnectionsForBlock,
        collections,
        createCollection,
        getCollection,
        addConnections,
        replaceConnections,
        deleteCollection,
        getCollectionItems,
        arenaAccessToken,
        updateArenaAccessToken,
        // TODO: remove
        db,
        initDatabases,
        fetchBlocks,
        fetchCollections,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
