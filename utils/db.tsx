import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { MimeType } from "./mimeTypes";
import { ShareIntent } from "../hooks/useShareIntent";
import { Collection, CollectionInsertInfo } from "./dataTypes";

function openDatabase() {
  if (Platform.OS === "web") {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        };
      },
    } as unknown as SQLite.SQLiteDatabase;
  }

  const db = SQLite.openDatabase("db.db");
  return db;
}

const db = openDatabase();

interface BlockInsertInfo {
  title: string;
  description?: string; // long-form description about the object, could include things like tags here and those get automatically extracted?
  content: string; // could be either the data itself or a path to the data if a rich media object
  //   TODO: add type
  type: MimeType;
  source?: string; // the URL where the object was captured from. If a photo with EXIF data, then the location metadata
  //   TODO: add type
  remoteSourceType?: string; // map to explicit list of external providers? This can also be used to make the ID mappers, sync methods, etc. Maybe take some inspiration from Wildcard’s site adapters for typing here?
  createdBy: string; // DID of the person who made it?
}

interface BlockConnection {
  blockId: string;
  collectionId: string;
  createdAt: Date;
}

export interface Block extends BlockInsertInfo {
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
  createCollection: (collection: CollectionInsertInfo) => void;
  getCollectionItems: (collectionId: string) => Promise<Block[]>;
  getCollection: (collectionId: string) => Promise<Collection>;
  deleteCollection: (id: string) => void;

  // share intent
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  blocks: [],
  createBlock: () => {},
  getBlock: async () => {
    throw new Error("not yet loaded");
  },
  deleteBlock: () => {},
  collections: [],
  createCollection: () => {},
  getCollection: async () => {
    throw new Error("not yet loaded");
  },
  deleteCollection: () => {},
  getCollectionItems: async () => [],

  setShareIntent: () => {},
  shareIntent: null,
});

function mapSnakeCaseToCamelCaseProperties(obj: object): object {
  const newObj = {};
  for (const key in obj) {
    const newKey = key.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace("-", "").replace("_", "");
    });
    // @ts-ignore
    newObj[newKey] = obj[key];
  }
  return newObj;
}

export function DatabaseProvider({ children }: PropsWithChildren<{}>) {
  useEffect(() => {
    db.transaction((tx) => {
      // Set up tables
      // TODO: figure out id scheme
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS blocks (
            id integer PRIMARY KEY AUTOINCREMENT,
            title varchar(128) NOT NULL,
            content TEXT NOT NULL,
            description TEXT,
            type varchar(128) NOT NULL,
            source TEXT,
            remote_source_type varchar(128),
            created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT NOT NULL
        );`
      );
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS collections (
            id integer PRIMARY KEY AUTOINCREMENT,
            title varchar(128) NOT NULL,
            description TEXT,
            created_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT NOT NULL
        );`
      );
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS connections(
            block_id integer NOT NULL,
            collection_id integer NOT NULL,
            creation_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modification_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (block_id, collection_id),
            FOREIGN KEY (block_id) REFERENCES blocks(id),
            FOREIGN KEY (collection_id) REFERENCES collections(id)
        );`
      );
    });
  }, []);

  const createBlock = async (block: BlockInsertInfo) => {
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
          block.title,
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
    await db.transactionAsync(async (tx) => {
      const result = await tx.executeSqlAsync(
        `
        INSERT INTO collections (
            title,
            description,
            created_by
        ) VALUES (
            ?,
            ?,
            ?
        );`,
        [
          collection.title,
          // @ts-ignore expo sqlite types are broken
          collection.description || null,
          collection.createdBy,
        ]
      );
      fetchCollections();
    });
  };

  function fetchBlocks() {
    db.transaction((tx) => {
      tx.executeSql(`SELECT * FROM blocks;`, [], (_, { rows: { _array } }) => {
        setBlocks([
          ..._array.map(
            (block) =>
              ({
                ...block,
                createdAt: new Date(block.created_timestamp),
                updatedAt: new Date(block.updated_timestamp),
                createdBy: block.created_by,
                remoteSourceType: block.remote_source_type,
                // TODO: add connections
                connections: [],
              } as Block)
          ),
          ,
        ]);
      });
    });
  }

  function fetchCollections() {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM collections;`,
        [],
        (_, { rows: { _array } }) => {
          setCollections([
            ..._array.map(
              (collection) =>
                ({
                  ...collection,
                  createdAt: new Date(collection.created_timestamp),
                  updatedAt: new Date(collection.updated_timestamp),
                  createdBy: collection.created_by,
                  // TODO: add collaborators and numItems
                  numItems: 2,
                  collaborators: ["spencer-did"],
                } as Collection)
            ),
          ]);
        }
      );
    });
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
          createdAt: new Date(block.created_timestamp),
          updatedAt: new Date(block.updated_timestamp),
          createdBy: block.created_by,
          remoteSourceType: block.remote_source_type,
        } as Block)
    );
  }

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);

  useEffect(() => {
    void fetchBlocks();
    void fetchCollections();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        createBlock: createBlock,
        blocks,
        getBlock,
        deleteBlock,
        setShareIntent,
        shareIntent,
        collections,
        createCollection,
        getCollection,
        deleteCollection,
        getCollectionItems,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
