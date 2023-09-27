import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { MimeType } from "./mimeTypes";
import { ShareIntent } from "../hooks/useShareIntent";
import { Collection, CollectionInsertInfo } from "./dataTypes";
// TODO: remove
const TestBlocks: Block[] = [
  {
    id: "1123",
    title: "Test Block",
    description: "This is a test block",
    content: "https://picsum.photos/200",
    type: MimeType[".jpeg"],
    createdBy: "spencer-did",
    connections: [],
    createdAt: new Date("2023-09-18"),
    updatedAt: new Date("2023-09-18"),
  },
  {
    id: "1123123",
    title: "Mary Oliver on living",
    description: "",
    content: "Listen, are you breathing just a little, and calling it a life?",
    type: MimeType[".txt"],
    createdBy: "spencer-did",
    connections: [],
    createdAt: new Date("2023-09-18"),
    updatedAt: new Date("2023-09-18"),
  },
];

const TestCollections: Collection[] = [
  {
    id: "123",
    title: "Uncategorized",
    description: "A collection of all blocks that have not been categorized",
    createdBy: "spencer-did",
    updatedAt: new Date("2023-09-18"),
    createdAt: new Date("2023-09-18"),
    collaborators: ["spencer-did"],
    numItems: 2,
  },
];

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
  deleteBlock: (id: string) => void;
  collections: Collection[];
  createCollection: (collection: CollectionInsertInfo) => void;

  // share intent
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  blocks: [],
  createBlock: () => {},
  deleteBlock: () => {},
  collections: [],
  createCollection: () => {},

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
          block.description || "null",
          block.content,
          block.type,
          block.source || "null",
          block.remoteSourceType || "null",
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

  const [blocks, setBlocks] = useState<Block[]>([...TestBlocks]);
  const [collections, setCollections] = useState<Collection[]>([
    ...TestCollections,
  ]);

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
          collection.description || "null",
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
                createdAt: block.created_timestamp,
                updatedAt: block.updated_timestamp,
                createdBy: block.created_by,
                remoteSourceType: block.remote_source_type,
                // TODO: add connections
                connections: [],
              } as Block)
          ),
          ...TestBlocks,
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
                  createdAt: collection.created_timestamp,
                  updatedAt: collection.updated_timestamp,
                  createdBy: collection.created_by,
                  // TODO: add collaborators and numItems
                  numItems: 2,
                  collaborators: ["spencer-did"],
                } as Collection)
            ),
            ...TestCollections,
          ]);
        }
      );
    });
  }

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        createBlock: createBlock,
        blocks,
        deleteBlock,
        setShareIntent,
        shareIntent,
        collections,
        createCollection,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
