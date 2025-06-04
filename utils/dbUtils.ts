import { PHOTOS_FOLDER } from "./blobs";
import * as FileSystem from "expo-file-system";
import {
  Block,
  RemoteSourceType,
  RemoteSourceInfo,
  LocationMetadata,
} from "./dataTypes";
import { convertDbTimestampToDate } from "./date";
import { BlockType } from "./mimeTypes";

// escapes % and _ characters in the search string
export function getEscapedSearchString(searchString: string): string {
  return `'%${searchString.replace(/%/g, "\\%").replace(/_/g, "\\_")}%'`;
}

export function mapDbBlockToBlock(block: any): Block {
  const blockMappedToCamelCase = mapSnakeCaseToCamelCaseProperties(block);

  let parsedLocationData: LocationMetadata | undefined;
  try {
    parsedLocationData = block.location_data
      ? (JSON.parse(block.location_data) as LocationMetadata)
      : undefined;
  } catch (err) {
    console.log("error", err);
    parsedLocationData = undefined;
  }

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
    connectedAt: convertDbTimestampToDate(block.connected_at),
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
    captureTime: block.capture_time,
    locationData: parsedLocationData,
  } as Block;
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
