import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { MimeType } from "./mimeTypes";
import { ShareIntent } from "../hooks/useShareIntent";
import { Collection, CollectionInsertInfo } from "./dataTypes";
import { currentUser } from "./user";
import { convertDbTimestampToDate } from "./date";

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

interface BlockInsertInfo {
  title?: string;
  description?: string; // long-form description about the object, could include things like tags here and those get automatically extracted?
  content: string; // could be either the data itself or a path to the data if a rich media object
  //   TODO: add type
  type: MimeType;
  source?: string; // the URL where the object was captured from. If a photo with EXIF data, then the location metadata
  //   TODO: add type
  remoteSourceType?: string; // map to explicit list of external providers? This can also be used to make the ID mappers, sync methods, etc. Maybe take some inspiration from Wildcard’s site adapters for typing here?
  createdBy: string; // DID of the person who made it?

  collectionsToConnect?: string[]; // IDs of collections that this block is in
}

interface BlockConnection {
  blockId: string;
  collectionId: string;
  createdAt: Date;
}

export interface Block extends Omit<BlockInsertInfo, "connections"> {
  id: string;
  connections: BlockConnection[];
  createdAt: Date;
  updatedAt: Date;
}

interface DatabaseContextProps {
  blocks: Block[];
  createBlock: (block: BlockInsertInfo) => void;
  getBlock: (blockId: string) => Promise<Block>;
  deleteBlock: (id: string) => void;
  collections: Collection[];
  createCollection: (collection: CollectionInsertInfo) => Promise<string>;
  getCollectionItems: (collectionId: string) => Promise<Block[]>;
  getCollection: (collectionId: string) => Promise<Collection>;
  deleteCollection: (id: string) => void;

  addConnections(blockId: string, collectionIds: string[]): Promise<void>;

  // share intent
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;

  // TODO: remove this once apis solidify
  db: SQLite.SQLiteDatabase;
  initDatabases: () => Promise<void>;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  blocks: [],
  createBlock: () => {},
  getBlock: async () => {
    throw new Error("not yet loaded");
  },
  deleteBlock: () => {},
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

  setShareIntent: () => {},
  shareIntent: null,

  db,
  initDatabases: async () => {},
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
            source TEXT,
            remote_source_type varchar(128),
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
            created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT NOT NULL
        );`
        ),
      ]);

      if (results.some((result) => "error" in result)) {
        throw results.find((result) => "error" in result)?.error;
      }

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

      if ("error" in result) {
        throw result.error;
      }
    });
  }

  const createBlock = async ({
    collectionsToConnect: connections,
    ...block
  }: BlockInsertInfo) => {
    await db.transactionAsync(async (tx) => {
      const result = await tx.executeSqlAsync(
        `
        INSERT INTO blocks (
            title,
            description,
            content,
            type,
            source,
            remote_source_type,
            created_by
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        );`,
        [
          // @ts-ignore expo sqlite types are broken
          block.title || null,
          // @ts-ignore expo sqlite types are broken
          block.description || null,
          block.content,
          block.type,
          // @ts-ignore expo sqlite types are broken
          block.source || null,
          // @ts-ignore expo sqlite types are broken
          block.remoteSourceType || null,
          block.createdBy,
        ]
      );
      if ("error" in result) {
        throw result.error;
      }

      if (connections?.length) {
        console.log("INSERT ID", result.insertId);
        await addConnections(String(result.insertId!), connections);
      }

      fetchBlocks();
    });
  };

  const deleteBlock = async (id: string) => {
    await db.transactionAsync(async (tx) => {
      const result = await tx.executeSqlAsync(
        `
        DELETE FROM blocks WHERE id = ?;`,
        [id]
      );
      setBlocks(blocks.filter((block) => block.id !== id));
    });
  };

  const deleteCollection = async (id: string) => {
    await db.transactionAsync(async (tx) => {
      await tx.executeSqlAsync(
        `
        DELETE FROM collections WHERE id = ?;`,
        [id]
      );
      setCollections(collections.filter((collection) => collection.id !== id));
    });
  };

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const createCollection = async (collection: CollectionInsertInfo) => {
    const [result] = await db.execAsync(
      [
        {
          sql: `
        INSERT INTO collections (
            title,
            description,
            created_by
        ) VALUES (
            ?,
            ?,
            ?
        );`,
          args: [
            collection.title,
            // @ts-ignore expo sqlite types are broken
            collection.description || null,
            collection.createdBy,
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
      tx.executeSql(`SELECT * FROM blocks;`, [], (_, { rows: { _array } }) => {
        setBlocks(
          _array.map(
            (block) =>
              ({
                ...block,
                // TODO: resolve schema so you dont have to do this because its leading to a lot of confusing errors downstraem from types
                id: block.id.toString(),
                createdAt: convertDbTimestampToDate(block.created_timestamp),
                updatedAt: convertDbTimestampToDate(block.updated_timestamp),
                createdBy: block.created_by,
                remoteSourceType: block.remote_source_type,
                // TODO: add connections
                connections: [],
              } as Block)
          )
        );
      });
    });
  }

  function fetchCollections() {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `SELECT 
          collections.id,
          collections.title,
          collections.description,
          collections.created_timestamp,
          collections.updated_timestamp,
          collections.created_by,
          COUNT(connections.block_id) as num_blocks
         FROM collections
         LEFT JOIN connections ON collections.id = connections.collection_id
         GROUP BY 1,2,3,4,5,6;`,
          [],
          (_, { rows: { _array } }) => {
            setCollections([
              ..._array.map(
                (collection) =>
                  ({
                    ...collection,
                    // TODO: resolve schema so you dont have to do this because its leading to a lot of confusing errors downstraem from types
                    id: collection.id.toString(),
                    createdAt: convertDbTimestampToDate(
                      collection.created_timestamp
                    ),
                    updatedAt: convertDbTimestampToDate(
                      collection.updated_timestamp
                    ),
                    createdBy: collection.created_by,
                    numBlocks: collection.num_blocks,
                    // TODO: add collaborators
                    collaborators: ["spencer-did"],
                  } as Collection)
              ),
            ]);
          }
        );
      },
      (err) => {
        console.error(err);
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
          remoteSourceType: block.remote_source_type,
        } as Block)
    );
  }

  async function addConnections(blockId: string, collectionIds: string[]) {
    const result = await db.execAsync(
      collectionIds.map((collectionId) => ({
        sql: `INSERT INTO connections (block_id, collection_id, created_by)
              VALUES (?, ?, ?);`,
        args: [blockId, collectionId, currentUser().id],
      })),
      false
    );

    const errors: SQLite.ResultSetError[] = result.filter(
      (result) => "error" in result
    );
    if (errors.length) {
      throw errors[0].error;
    }
  }

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);

  useEffect(() => {
    void fetchBlocks();
    void fetchCollections();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        createBlock,
        blocks,
        getBlock,
        deleteBlock,
        setShareIntent,
        shareIntent,
        collections,
        createCollection,
        getCollection,
        addConnections,
        deleteCollection,
        getCollectionItems,
        db,
        initDatabases,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
