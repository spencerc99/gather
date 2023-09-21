import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import { PropsWithChildren, createContext, useEffect, useState } from "react";
import { MimeType } from "./mimeTypes";
import { ShareIntent } from "../hooks/useShareIntent";
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
  addBlock: (block: BlockInsertInfo) => void;
  blocks: Block[];
  setShareIntent: (intent: ShareIntent | null) => void;
  shareIntent: ShareIntent | null;
}

export const DatabaseContext = createContext<DatabaseContextProps>({
  addBlock: () => {},
  blocks: [],
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
    });
  }, []);

  const addBlock = async (block: BlockInsertInfo) => {
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

  const [blocks, setBlocks] = useState<Block[]>([...TestBlocks]);

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

  const [shareIntent, setShareIntent] = useState<ShareIntent | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        addBlock,
        blocks,
        setShareIntent,
        shareIntent,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
