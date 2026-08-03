// ABOUTME: Builds Are.na API request bodies for media uploads and block creation.
// ABOUTME: Identifies image bytes so uploads use accurate content types and filenames.
const ArenaUploadBucketUrl =
  "https://s3.amazonaws.com/arena_images-temp";

const ArenaUploadExtensions: Record<string, string> = {
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/webp": "webp",
  "video/mp2t": "ts",
  "video/mp4": "mp4",
  "video/mpeg": "mpeg",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
  "video/x-msvideo": "avi",
};

function parseArenaId(id: string): number {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new Error(`Invalid Are.na id: ${id}`);
  }
  return parsedId;
}

function buildArenaChannels(channelIds: string[]) {
  if (channelIds.length === 0) {
    throw new Error("At least one Are.na channel is required");
  }
  if (channelIds.length > 20) {
    throw new Error("Are.na accepts at most 20 channels per request");
  }
  return channelIds.map((id) => ({ id: parseArenaId(id) }));
}

export function buildArenaPresignRequest(
  filename: string,
  contentType: string,
) {
  return {
    files: [
      {
        filename,
        content_type: contentType,
      },
    ],
  };
}

export function getArenaUploadSourceUrl(key: string): string {
  if (!key) {
    throw new Error("Are.na upload key is required");
  }
  return `${ArenaUploadBucketUrl}/${key}`;
}

export function getArenaUploadFilename(
  blockId: string,
  contentType: string,
): string {
  const extension = ArenaUploadExtensions[contentType];
  if (!extension) {
    throw new Error(
      `Unsupported Are.na upload content type: ${contentType}`,
    );
  }
  return `gather-${blockId}.${extension}`;
}

export function buildArenaBlockRequest({
  value,
  channelIds,
  title,
  description,
}: {
  value: string;
  channelIds: string[];
  title?: string;
  description?: string;
}) {
  return {
    value,
    channels: buildArenaChannels(channelIds),
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
  };
}

export function buildArenaConnectionRequest({
  arenaBlockId,
  channelIds,
}: {
  arenaBlockId: string;
  channelIds: string[];
}) {
  return {
    connectable_id: parseArenaId(arenaBlockId),
    connectable_type: "Block" as const,
    channels: buildArenaChannels(channelIds),
  };
}

interface ArenaConnectionResponse {
  connected_at?: string;
  connected_by?: {
    id: number;
    slug: string;
  } | null;
}

export function mapArenaConnectionBatch({
  channelIds,
  connections,
}: {
  channelIds: string[];
  connections: ArenaConnectionResponse[];
}) {
  const connectedAt = connections
    .map((connection) => connection.connected_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const connectedBy = connections.find(
    (connection) => connection.connected_by?.slug,
  )?.connected_by;
  if (!connectedAt || !connectedBy) {
    return {};
  }

  return Object.fromEntries(
    channelIds.map((channelId) => [
      channelId,
      {
        connected_at: connectedAt,
        user: {
          id: connectedBy.id,
          slug: connectedBy.slug,
        },
      },
    ]),
  );
}

function matchesBytes(
  bytes: Uint8Array,
  expected: number[],
  offset = 0,
): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return Array.from(bytes.slice(offset, offset + length))
    .map((byte) => String.fromCharCode(byte))
    .join("");
}

export function detectImageContentType(
  bytes: Uint8Array,
): string | undefined {
  if (matchesBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (
    matchesBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }
  if (
    matchesBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matchesBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }
  if (
    matchesBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    matchesBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  if (readAscii(bytes, 4, 4) !== "ftyp") {
    return undefined;
  }

  const brand = readAscii(bytes, 8, 4);
  if (["heic", "heix", "hevc", "hevx"].includes(brand)) {
    return "image/heic";
  }
  if (["heim", "heis", "mif1", "msf1"].includes(brand)) {
    return "image/heif";
  }
  return undefined;
}
