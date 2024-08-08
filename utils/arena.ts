import {
  Block,
  Collection,
  DatabaseBlockInsert,
  LastSyncedInfo,
  RemoteSourceType,
} from "./dataTypes";
import { BlockType, MimeType } from "./mimeTypes";
import { logError } from "./errors";
import { withQueryParams } from "./url";
const XMLParser = require("react-xml-parser");
import {
  ArenaUpdatedBlocksKey,
  ArenaUpdatedChannelsKey,
  getItem,
  setItem,
} from "./asyncStorage";
import { getCreatedByForRemote } from "./remote";

export const ArenaClientId = process.env.EXPO_PUBLIC_ARENA_CLIENT_ID!;
export const ArenaClientSecret = process.env.EXPO_PUBLIC_ARENA_CLIENT_SECRET!;
export const ArenaGraphqlKey = process.env.EXPO_PUBLIC_ARENA_GRAPHQL_KEY!;
export const ArenaTokenStorageKey = "arena-token";
const GatherArenaAttribution =
  "created with [Gather](https://gather.directory/)";

enum ArenaVisibility {
  Public = "public",
  Closed = "closed",
  Private = "private",
}

interface ArenaConnection {
  connected_at: string;
  user: {
    id: number;
    slug: string;
  };
}

export interface ArenaChannelInfo {
  id: number;
  title: string;
  created_at: Date;
  updated_at: Date;
  added_to_at: Date;
  published: boolean;
  open: boolean;
  collaboration: boolean;
  collaborator_count: number;
  slug: string;
  length: number;
  kind: string;
  status: string;
  user_id: number;
  follower_count: number;
  metadata: Metadata;
  contents: RawArenaChannelItem[];
  user: RawArenaUser;
}
// Generated by https://quicktype.io

export interface RawArenaUser {
  created_at: string;
  slug: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string;
  avatar_image: AvatarImage;
  channel_count: number;
  following_count: number;
  profile_id: number;
  follower_count: number;
  initials: string;
  can_index: boolean;
  metadata: Metadata;
  is_premium: boolean;
  is_lifetime_premium: boolean;
  is_supporter: boolean;
  is_exceeding_connections_limit: boolean;
  is_confirmed: boolean;
  is_pending_reconfirmation: boolean;
  is_pending_confirmation: boolean;
  badge: string;
  id: number;
  base_class: string;
  class: string;
}

export interface AvatarImage {
  thumb: string;
  display: string;
}

export interface Metadata {
  description: null | string;
}

export type ArenaClass =
  | "Image"
  | "Text"
  | "Link"
  | "Media"
  | "Attachment"
  | "Embed"
  | "Block";
export interface RawArenaChannelItem {
  id: string;
  title: string;
  content: string;
  content_html?: string;
  created_at: string;
  updated_at: string;
  description_html?: string;
  description: string;
  image?: {
    content_type: string;
    display: { url: string };
    square: { url: string };
    thumb: { url: string };
    original: {
      url: string;
    };
  } | null;
  source: {
    url: string;
  } | null;
  url: string;
  base_class: "Block" | "Channel";
  class: ArenaClass;
  connected_at: string;
  connected_by_user_id: string;
  connected_by_user_slug: string;
  embed?: {
    url: null;
    type: string;
    title: null;
    author_name: string;
    author_url: string;
    source_url: null;
    thumbnail_url: null;
    width: number;
    height: number;
    html: string;
  };
  attachment?: {
    file_name: string;
    file_size: number;
    file_size_display: string;
    content_type: string;
    extension: string;
    url: string;
  };
  user: RawArenaUser;
}

// Generated by https://quicktype.io
export interface RawArenaBlock {
  title: string;
  updated_at: string;
  created_at: string;
  connected_at: string | null;
  state: string;
  comment_count: number;
  generated_title: string;
  content_html: string;
  description_html: string;
  visibility: string;
  content: string;
  description: string;
  image: {
    content_type: string;
    display: { url: string };
    square: { url: string };
    thumb: { url: string };
    original: {
      url: string;
    };
  } | null;
  source: {
    url: string;
  } | null;
  embed: {
    url: null;
    type: string;
    title: null;
    author_name: string;
    author_url: string;
    source_url: null;
    thumbnail_url: null;
    width: number;
    height: number;
    html: string;
  } | null;
  attachment: {
    file_name: string;
    file_size: number;
    file_size_display: string;
    content_type: string;
    extension: string;
    url: string;
  };
  metadata: null;
  id: number;
  base_class: "Block" | "Channel";
  class: ArenaClass;
  user: RawArenaUser;
  connections: Connection[];
}

export interface Connection {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  added_to_at: string;
  published: boolean;
  open: boolean;
  collaboration: boolean;
  slug: string;
  length: number;
  kind: string;
  status: string;
  user_id: number;
  metadata: Metadata;
  share_link: null;
  base_class: string;
}

export interface AvatarImage {
  thumb: string;
  display: string;
}

export function apiUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, any>
): string {
  const url = `${baseUrl}${path}`;
  return withQueryParams(url, params || {});
}

export function nextUrlFromResponse(
  baseUrl: string,
  path: string,
  params: Record<string, any>,
  response: any
): string | undefined {
  // TODO: this is not standardized across are.na responses..
  const { page, length, per, current_page } = response;
  let currPage = page || current_page;
  if (currPage * per < length) {
    return apiUrl(baseUrl, path, { ...params, page: currPage + 1 });
  }
}

export function nextUrlFromArenaContentsResponse(
  baseUrl: string,
  path: string,
  params: Record<string, any>,
  response: any,
  perPage: number = 20
): string | undefined {
  const { contents } = response;
  if (contents.length === perPage) {
    return apiUrl(baseUrl, path, {
      ...params,
      page: Number(params.page) || 1 + 1,
    });
  }
}

const ArenaApiUrl = "https://api.are.na/v2";
const ArenaGraphqlApi = "https://api.are.na/graphql";
const ArenaChannelsApi = "https://api.are.na/v2/channels";
export const ArenaChannelRegex =
  /(?:https:\/\/)?(?:www\.)?are\.na\/[\w-]+\/([\w-]+)/;

function maybeParseChannelIdentifierFromUrl(maybeChannelUrl: string): string {
  if (ArenaChannelRegex.test(maybeChannelUrl)) {
    return maybeChannelUrl.match(ArenaChannelRegex)![1];
  }

  return maybeChannelUrl;
}

export function transformChannelUrlToApiUrl(url: string): string {
  const maybeChannelUrl = url.trim();
  if (maybeChannelUrl.startsWith(ArenaChannelsApi)) {
    return maybeChannelUrl;
  }

  const channel = maybeParseChannelIdentifierFromUrl(maybeChannelUrl);
  return `${ArenaChannelsApi}/${channel}`;
}

function escapeArenaStrings(str?: string): string | undefined {
  if (!str) {
    return str;
  }
  return str.replaceAll("&amp;", "&");
}

export async function getChannelThumb(
  channelIdOrUrl: string,
  { accessToken }: { accessToken?: string | null } = {}
): Promise<RawArenaChannelItem[]> {
  const channelId = maybeParseChannelIdentifierFromUrl(channelIdOrUrl);
  const url = `${ArenaChannelsApi}/${channelId}/thumb`;
  const resp = await fetch(url, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const respBody = await resp.json();
  return respBody.contents;
}

function mapListChannelItemsResponseToItems(
  result: ListChannelBlocksResult
): RawArenaChannelItem[] {
  return result.data.channel.blokks.map<RawArenaChannelItem>((block) => {
    const { user, connection_to, __typename, url, id, ...rest } = block;
    let blockInfo = {};
    switch (__typename) {
      case "Link":
        blockInfo = {
          content: block.image_url,
        };
        break;
      case "Image":
        blockInfo = {
          image: {
            content_type: block.content_type,
            display: { url: block.display },
          },
        };
        break;
      case "Embed":
        blockInfo = {
          embed: {
            url: block.embed_url,
          },
        };
        break;
      case "Attachment":
        blockInfo = {
          attachment: {
            content_type: block.content_type,
            url: block.file_url,
          },
        };
        break;
    }
    return {
      ...rest,
      id: id.toString(),
      connected_at: connection_to.connected_at,
      connected_by_user_id: connection_to.user.id.toString(),
      connected_by_user_slug: connection_to.user.slug,
      class: __typename,
      base_class: "Block",
      // @ts-ignore
      user: user as RawArenaUser,
      url: `https://are.na/${url}`,
      ...blockInfo,
    } as RawArenaChannelItem;
  });
}

const DefaultBlockPer = 30;
export async function getChannelItemsPaginated(
  channelId: string,
  {
    accessToken,
    page = 1,
    per = DefaultBlockPer,
  }: { accessToken?: string | null; page?: number; per?: number } = {}
): Promise<RawArenaChannelItem[]> {
  const baseQuery = listChannelBlocksQuery({ channelId, per, page });
  const resp = await fetch(ArenaGraphqlApi, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-APP-TOKEN": ArenaGraphqlKey,
    },
    body: JSON.stringify({
      query: baseQuery,
    }),
  });
  const respBody = await resp.json();
  let contents: RawArenaChannelItem[] =
    mapListChannelItemsResponseToItems(respBody);
  return contents;
}

export async function getChannelItems(
  channelId: string,
  {
    accessToken,
    lastSyncedInfo,
  }: { accessToken?: string | null; lastSyncedInfo?: LastSyncedInfo | null }
) {
  console.log(
    "Fetching items for channel",
    channelId,
    ". Looking for items after ",
    lastSyncedInfo?.lastSyncedBlockCreatedAt
  );
  let fetchedItems: RawArenaChannelItem[] = [];
  let newItemsFound = lastSyncedInfo ? false : true;
  const lastSyncedBlockCreatedAt = lastSyncedInfo?.lastSyncedBlockCreatedAt;
  let numItemsFetched = 0;
  let page = 1;
  const per = DefaultBlockPer;
  const baseQuery = listChannelBlocksQuery({ channelId, page });

  function nextQueryFromResponse(
    currentPage: number,
    per: number,
    items: RawArenaChannelItem[]
  ) {
    if (items.length === per) {
      return listChannelBlocksQuery({ channelId, page: currentPage + 1 });
    }
  }
  try {
    let nextQuery: string | undefined = baseQuery;
    while (nextQuery) {
      let contents = await getChannelItemsPaginated(channelId, {
        page,
        per,
        accessToken,
      });
      numItemsFetched += contents.length;
      const stopIdx = lastSyncedBlockCreatedAt
        ? contents.findIndex(
            (c) =>
              new Date(c.connected_at).getTime() <
              new Date(lastSyncedBlockCreatedAt).getTime()
          )
        : null;
      console.log("stopidx", stopIdx, lastSyncedBlockCreatedAt);

      if (stopIdx && stopIdx > -1) {
        contents = contents.slice(0, stopIdx);
      }
      fetchedItems.push(...contents);

      if (stopIdx !== null && stopIdx > -1) {
        // we finished fetching all the items we needed
        break;
      }

      nextQuery = nextQueryFromResponse(page, per, contents);
      page++;
    }
  } catch (e) {
    logError(e);
    throw e;
  }
  console.log(
    `Fetched ${numItemsFetched} items. Returned ${fetchedItems.length} items.`
  );
  return fetchedItems;
}

export async function getChannelInfo(
  channelId: string,
  accessToken?: string | null
): Promise<Omit<ArenaChannelInfo, "contents">> {
  const baseUrl = `${ArenaChannelsApi}/${channelId}/thumb`;
  let channelInfo = {};
  try {
    const resp = await fetch(baseUrl, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    const respBody = await resp.json();
    if (!resp.ok) {
      throw new Error(
        `${resp.status}: failed to fetch channel info ${resp.statusText}`
      );
    }
    const { contents, ...rest } = respBody;
    channelInfo = rest as ArenaChannelInfo;
  } catch (e) {
    logError(e);
    throw e;
  }
  return channelInfo as ArenaChannelInfo;
}

export async function getChannelInfoFromUrl(
  url: string,
  accessToken?: string | null
): Promise<ArenaChannelInfo> {
  const transformedUrl = transformChannelUrlToApiUrl(url);
  console.log("getting arena info from url", transformedUrl);
  let fetchedItems: RawArenaChannelItem[] = [];
  const baseUrl = transformedUrl;
  let channelInfo = {};
  let isFirstFetch = true;
  try {
    let nextUrl: string | undefined = baseUrl;
    while (nextUrl) {
      const resp = await fetch(nextUrl, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const respBody = await resp.json();
      if (isFirstFetch) {
        const { contents, ...rest } = respBody;
        channelInfo = rest as ArenaChannelInfo;
        isFirstFetch = false;
      }
      let contents: RawArenaChannelItem[] = respBody.contents;
      // TODO: recursively traverse the sub-channels
      contents = contents.filter(
        // NOTE: class = block only if are.na has failed to process it
        (c) => c.base_class === "Block" && c.class !== "Block"
      );
      // TODO: this should all migrate to the new block fetch...
      contents = contents.map((c) => ({
        ...c,
        title: escapeArenaStrings(c.title),
        description: escapeArenaStrings(c.description),
        content: c.class === "Text" ? escapeArenaStrings(c.content) : c.content,
      }));
      // Update storage with any new items
      fetchedItems.push(...contents);
      nextUrl = nextUrlFromResponse(baseUrl, "", {}, respBody);
    }
  } catch (e) {
    logError(e);
    throw e;
  }
  return { ...channelInfo, contents: fetchedItems } as ArenaChannelInfo;
}

export function arenaClassToBlockType(
  arenaItem: RawArenaChannelItem
): BlockType {
  const { class: classVal, embed, attachment, image } = arenaItem;
  switch (classVal) {
    case "Image":
      return BlockType.Image;
    // TODO: figure this out
    /**
 * "attachment": {
"file_name": "bad793f1615be6750041f44435d6a734.pdf",
"file_size": 1828021,
"file_size_display": "1.74 MB",
"content_type": "application/pdf",
"extension": "pdf",
"url": "https://arena-attachments.s3.amazonaws.com/24342276/bad793f1615be6750041f44435d6a734.pdf?1698188778"
},
 */
    case "Attachment":
      return BlockType.Document;
    case "Text":
      return BlockType.Text;
    case "Link":
    case "Embed":
      return BlockType.Link;
    /**
 * "embed": {
"url": null,
"type": "video",
"title": null,
"author_name": "i luv ur fit",
"author_url": "https://www.tiktok.com/@iluvurfit",
"source_url": null,
"thumbnail_url": null,
"width": 340,
"height": 700,
"html": "<iframe class=\"embedly-embed\" src=\"https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.tiktok.com%2Fembed%2Fv2%2F7289096161972145454&wmode=transparent&display_name=tiktok&url=https%3A%2F%2Fwww.tiktok.com%2Ft%2FZT8hD1Bog%2F&image=https%3A%2F%2Fp16-sign.tiktokcdn-us.com%2Fobj%2Ftos-useast5-p-0068-tx%2Fb315ba9606dc43218406892eb4553159_1697124965%3Fx-expires%3D1697605200%26x-signature%3DtCNQfgJ4KixPZxFCJQAGxX39140%253D&key=95f38852bd9b4f51ba7e5c8900281d06&type=text%2Fhtml&schema=tiktok\" width=\"340\" height=\"700\" scrolling=\"no\" title=\"tiktok embed\" frameborder=\"0\" allow=\"autoplay; fullscreen; encrypted-media; picture-in-picture;\" allowfullscreen=\"true\"></iframe>"
},
 */
    // TODO: actually handle this and use embed, need to figure out what embed url to use since URL is empty, for now it just
    // shows an image.
    // this should honestly probably be Video Rather than anything with an embed.
    case "Media":
      return embed?.url ? BlockType.Link : BlockType.Image;
    default:
      throw new Error(
        `Unhandled arena class: ${classVal}, ${JSON.stringify(arenaItem)}`
      );
  }
}

export function arenaClassToMimeType({
  class: classVal,
  embed,
  attachment,
  image,
}: RawArenaChannelItem): MimeType | undefined {
  switch (classVal) {
    case "Image":
      return image!.content_type as MimeType;
    case "Attachment":
      return attachment!.content_type as MimeType;
    case "Text":
    case "Link":
      return undefined;
    // TODO: actually handle this and use embed, need to figure out what embed url to use since URL is empty, for now it just
    // shows an image.
    case "Media":
      return embed?.url ? undefined : (image!.content_type as MimeType);
  }
}

export const buildFormDataFromFile = ({
  file,
  policy,
  contentType,
}: {
  // This is the format expected for "blob" idk lol
  // for reference: https://github.com/benjreinhart/react-native-aws3
  file: { uri: string; name: string; type?: string };
  policy: S3UploadPolicy;
  contentType: string;
}): FormData => {
  const formData = new FormData();

  formData.append("Content-Type", contentType);
  formData.append("key", policy.key);
  formData.append("AWSAccessKeyId", policy.AWSAccessKeyId);
  formData.append("acl", policy.acl);
  formData.append("success_action_status", policy.success_action_status);
  formData.append("policy", policy.policy);
  formData.append("signature", policy.signature);
  // @ts-ignore
  formData.append("file", file);

  return formData;
};

export const parseLocationFromS3Response = (data: string) => {
  const parser = new XMLParser();
  const parsed = parser.parseFromString(data);
  return parsed.getElementsByTagName("Location")[0].value;
};

export interface S3UploadPolicy {
  key: string;
  AWSAccessKeyId: string;
  acl: string;
  success_action_status: string;
  policy: string;
  signature: string;
  bucket: string;
}

const uploadPolicyQuery = `
  query UploadPolicy {
    me {
      __typename
      id
      ...AvatarUploader
    }
  }
  fragment AvatarUploader on Me {
    __typename
    id
    policy {
      __typename
      AWSAccessKeyId
      acl
      bucket
      expires
      key
      policy
      signature
      success_action_status
    }
  }
`;

async function getUploadPolicy(accessToken: string): Promise<S3UploadPolicy> {
  const resp = await fetch(ArenaGraphqlApi, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-APP-TOKEN": ArenaGraphqlKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: uploadPolicyQuery,
    }),
  });
  const respBody = await resp.json();
  if (!respBody?.data?.me?.policy) {
    throw new Error(
      `failed to upload image to arena. no upload policy found: ${JSON.stringify(
        respBody
      )}`
    );
  }

  return respBody.data.me.policy;
}

export async function uploadFile({
  file,
  policy,
  contentType,
}: {
  file: { uri: string; name: string; type?: string };
  contentType: string;
  policy: S3UploadPolicy;
}): Promise<string> {
  const formData = buildFormDataFromFile({
    file,
    policy,
    contentType,
  });

  try {
    const resp = await fetch(policy.bucket, {
      method: "POST",
      body: formData,
    });
    const respBody = await resp.text();
    if (!resp.ok) {
      throw new Error(
        `failed to upload file to arena: ${resp.status} ${respBody}`
      );
    }
    return await parseLocationFromS3Response(respBody);
  } catch (err) {
    logError(err);
    throw err;
  }
}

async function getValueForBlock(
  block: Block,
  accessToken: string
): Promise<any> {
  const { type, title, content, source, contentType } = block;
  switch (type) {
    case BlockType.Text:
      return content;
    case BlockType.Image:
    case BlockType.Video:
      const uploadPolicy = await getUploadPolicy(accessToken);
      const url = await uploadFile({
        file: {
          uri: content,
          name: title || "",
          type: contentType || "",
        },
        policy: uploadPolicy,
        contentType: contentType || "image/jpeg",
      });
      console.log("Uploaded file to arena", url);

      return url;
    case BlockType.Link:
      return source!;
    case BlockType.Audio:
    case BlockType.Document:
      throw new Error("unsupported type");
  }
}

export interface ListChannelBlocksResult {
  data: {
    channel: {
      blokks: ListChannelBlocksResultType[];
    };
  };
}

export interface ListChannelBlocksResultType {
  __typename: ArenaClass;
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  description: null | string;
  source: { url: string };
  url: string;
  user: {
    slug: string;
    name: string;
    avatar: string;
    id: number;
  };
  connection_to: {
    connected_at: string;
    user: {
      id: number;
      slug: string;
    };
  };
  image_url?: string;
  display?: string;
  embed_url?: string;
  file_url?: string;
  content_type?: string;
  content?: string;
}

const listChannelBlocksQuery = ({
  channelId,
  per = 30,
  page,
}: {
  channelId: string;
  per?: number;
  page: number;
}) => `
{
  channel(
    id:${channelId}
    ) {
      blokks(
      sort_by:CREATED_AT
      direction:DESC
      per: ${per}
      page: ${page}
      type: BLOCK
    ) {
        __typename
        ... on Model {
          id
          created_at(format: "%Y-%m-%dT%H:%M:%S.%LZ")
          updated_at(format: "%Y-%m-%dT%H:%M:%S.%LZ")
        }
        ... on ConnectableInterface {
          title
          description
          source {
            url
          }
          url: href
          user {
            slug
            name
            avatar
            id
          }
          connection_to(channel_id: ${channelId}) {
            connected_at: created_at(format: "%Y-%m-%dT%H:%M:%S.%LZ")
            user {
              id
              slug
            }
          }
        }
        ... on Link {
          image_url
        }
        ... on Text {
          content(format: PLAIN)
        }
        ... on Image {
          display: image_url(size: DISPLAY)
          content_type: file_content_type
        }
        ... on Embed {
          embed_url: image_url
        }
        ... on Attachment {
          file_url
          content_type: file_content_type
        }
      }
  }
}`;

const createBlockMutation = (channelIds: string[]) => `
  mutation createBlockMutation(
    $channel_ids: [ID]!
    $value: String
    $title: String
    $description: String
  ) {
    create_block(
      input: {
        channel_ids: $channel_ids
        value: $value
        title: $title
        description: $description
      }
    ) {
      block: blokk {
        __typename
        ... on Model {
          id
        }
        ... on ConnectableInterface {
          ${channelIds
            .map(
              (c) => `
              channel${c}: connection_to(channel_id: ${c}) {
                connected_at: created_at(format:"%Y-%m-%dT%H:%M:%S.%LZ")
                user {
                  id
                  slug
                }
              }`
            )
            .join("\n")}
        }
      }
    }
  }
`;

const createConnectionMutation = (channelIds: string[]) => `
  mutation createConnectionMutation(
    $channel_ids: [ID]!
    $connectable_id: ID!
    $connectable_type: BaseConnectableTypeEnum!
  ) {
    __typename
    create_connection(
      input: {
        channel_ids: $channel_ids
        connectable_type: $connectable_type
        connectable_id: $connectable_id
      }
    ) {
      __typename
      connectable {
       ${channelIds
         .map(
           (c) => `
              channel${c}: connection_to(channel_id: ${c}) {
                connected_at: created_at(format:"%Y-%m-%dT%H:%M:%S.%LZ")
                user {
                  id
                  slug
                }
              }`
         )
         .join("\n")}
      }
    }
  }`;

export async function createBlock({
  block,
  channelIds,
  arenaToken,
}: {
  block: Block;
  channelIds: string[];
  arenaToken: string;
}): Promise<{
  arenaBlock: RawArenaBlock;
  connections: { [channelId: string]: ArenaConnection };
}> {
  let resp: Response;
  let blockId = block.remoteSourceInfo?.arenaId;
  let connections: { [channelId: string]: ArenaConnection } = {};
  if (block.remoteSourceInfo?.arenaId) {
    console.log(
      `adding existing arena block ${block.remoteSourceInfo.arenaId} to channel`,
      channelIds
    );
    resp = await fetch(ArenaGraphqlApi, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${arenaToken}`,
        "Content-Type": "application/json",
        "X-APP-TOKEN": ArenaGraphqlKey,
      },
      body: JSON.stringify({
        query: createConnectionMutation(channelIds),
        variables: {
          channel_ids: channelIds,
          connectable_type: "BLOCK",
          connectable_id: block.remoteSourceInfo.arenaId,
        },
      }),
    });
    const response = await resp.json();
    if (response.errors?.length) {
      logError(
        `failed to create connection in arena ${JSON.stringify(response)}`
      );
      throw new Error(JSON.stringify(response));
    }
    channelIds.forEach((c) => {
      connections[c] = response.data.create_connection.connectable[
        `channel${c}`
      ] as ArenaConnection;
    });
  } else {
    const value = await getValueForBlock(block, arenaToken);
    console.log("adding block to channel", channelIds, value, arenaToken);
    const { title, description: blockDescription } = block;
    let description = blockDescription || GatherArenaAttribution;
    resp = await fetch(ArenaGraphqlApi, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${arenaToken}`,
        "Content-Type": "application/json",
        "X-APP-TOKEN": ArenaGraphqlKey,
      },
      body: JSON.stringify({
        query: createBlockMutation(channelIds),
        variables: {
          channel_ids: channelIds,
          value,
          title,
          description,
        },
      }),
    });
    if (!resp.ok) {
      logError(
        `failed to create block in arena ${resp.status}: ${JSON.stringify(
          resp
        )}`
      );
      throw new Error(JSON.stringify(resp));
    }

    const response = await resp.json();
    if (response.errors?.length) {
      logError(`failed to create block in arena ${JSON.stringify(response)}`);
      throw new Error(JSON.stringify(response));
    }

    channelIds.forEach((c) => {
      connections[c] = response.data.create_block.block[
        `channel${c}`
      ] as ArenaConnection;
    });

    blockId = response.data.create_block.block.id!;
  }

  if (!blockId) {
    logError("failed to get block id from response");
    throw new Error("failed to get block id from response");
  }

  const blockInfo = await getBlock(blockId, arenaToken);
  return {
    arenaBlock: blockInfo,
    connections,
  };
}

export async function updateArenaBlock({
  blockId,
  arenaToken,
  title,
  description,
}: {
  blockId: string;
  arenaToken: string;
  title?: string;
  description?: string;
}) {
  const body = {
    title,
    description,
  };
  Object.keys(body).forEach((key) => {
    // @ts-ignore
    if (!body[key]) body[key] = "";
  });
  const url = withQueryParams(`${ArenaApiUrl}/blocks/${blockId}`, body);
  const updateMetadata = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${arenaToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!updateMetadata.ok) {
    logError(
      `failed to update block metadata in arena ${updateMetadata.status}`
    );
    throw new Error(`${updateMetadata.status}: ${updateMetadata.statusText}`);
  }
  return updateMetadata;
}

export async function removeBlockFromChannel({
  blockId,
  channelId,
  arenaToken,
}: {
  blockId: string;
  channelId: string;
  arenaToken: string;
}): Promise<void> {
  const url = `${ArenaChannelsApi}/${channelId}/blocks/${blockId}`;
  console.log("deleting block from channel", channelId, blockId);
  const resp = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${arenaToken}`,
      "Content-Type": "application/json",
    },
  });
  const response = await resp.text();
  if (!resp.ok) {
    logError(
      `failed to remove block from arena channel ${
        resp.status
      }: ${JSON.stringify(response)}`
    );
    // TODO: this handles case if block is already deleted, change after migration
    if (resp.status === 401) {
      return;
    }
    throw new Error(JSON.stringify(response));
  }
}

export async function getMyArenaUserInfo(
  accessToken: string
): Promise<RawArenaUser> {
  return await fetch(`${ArenaApiUrl}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then((r) => r.json())
    .catch((err) => {
      logError(err);
      throw err;
    });
}

export async function getArenaUserInfo(
  slug: string
): Promise<RawArenaUser | null> {
  return await fetch(`${ArenaApiUrl}/users/${slug}`, {})
    .then((r) => r.json())
    .catch((err) => {
      logError(err);
      throw err;
    });
}

interface UserChannelResponse {
  channels: ArenaChannelInfo[];
  nextPage?: number;
}

export async function getUserChannels(
  accessToken: string,
  {
    page = 1,
    per = 30,
    search,
  }: { page?: number; per?: number; search?: string } = {}
): Promise<UserChannelResponse> {
  const userInfo = await getMyArenaUserInfo(accessToken);
  if (!userInfo?.id) {
    throw Error("failed to get user info from are.na");
  }
  const baseUrl = search
    ? withQueryParams(`https://api.are.na/v2/search/user/${userInfo.id}`, {
        "filter[type]": "channels",
        q: search,
        page,
        per,
      })
    : withQueryParams(`https://api.are.na/v2/users/${userInfo.id}/channels`, {
        per,
        page,
      });
  try {
    const resp = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const respBody = await resp.json();
    return {
      channels: respBody.channels,
      nextPage:
        respBody.current_page < respBody.total_pages
          ? respBody.current_page + 1
          : undefined,
    };
  } catch (e) {
    logError(e);
    throw e;
  }
}
export async function searchChannels(
  accessToken: string,
  {
    page = 1,
    per = 30,
    search,
  }: { page?: number; per?: number; search?: string } = {}
): Promise<UserChannelResponse> {
  const baseUrl = withQueryParams(`https://api.are.na/v2/search/channels`, {
    q: search,
    page,
    per,
  });
  try {
    const resp = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const respBody = await resp.json();
    return {
      channels: respBody.channels,
      nextPage:
        respBody.current_page < respBody.total_pages
          ? respBody.current_page + 1
          : undefined,
    };
  } catch (e) {
    logError(e);
    throw e;
  }
}

export async function createChannel({
  accessToken,
  title,
  // TODO: make this a default setting in settings
  visibility = ArenaVisibility.Private,
}: {
  accessToken: string;
  title: string;
  visibility?: ArenaVisibility;
}): Promise<{
  newChannel: ArenaChannelInfo;
}> {
  const url = `${ArenaApiUrl}/channels`;
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      title,
      description: GatherArenaAttribution,
      status: visibility,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const maybeChannel: ArenaChannelInfo = await resp.json();
  if (!resp.ok) {
    logError(`failed to create channel ${resp.status}: ${maybeChannel}`);
    throw new Error(JSON.stringify(maybeChannel));
  }
  await updateArenaChannel({
    channelId: maybeChannel.id.toString(),
    arenaToken: accessToken,
    description: GatherArenaAttribution,
  });

  return {
    newChannel: maybeChannel,
  };
}

export async function getBlock(
  blockId: string,
  arenaAccessToken?: string | null
): Promise<RawArenaBlock> {
  const resp = await fetch(`${ArenaApiUrl}/blocks/${blockId}`, {
    headers: {
      Authorization: `Bearer ${arenaAccessToken}`,
      "Content-Type": "application/json",
    },
  });
  const json = await resp.json();
  if (!resp.ok) {
    logError(`${resp.status} failed to get block ${resp.statusText}`);
    throw new Error(`${resp.status} failed to get block ${resp.statusText}`);
  }
  return json;
}

type BlockFieldUpdate = {
  [k in keyof Block]: number;
};
interface UpdatedBlocks {
  [blockId: string]: BlockFieldUpdate;
}

export function getPendingBlockUpdates(): UpdatedBlocks {
  const updatedBlocks = getItem<UpdatedBlocks>(ArenaUpdatedBlocksKey);
  return updatedBlocks || {};
}

export function recordPendingBlockUpdate(
  blockId: string,
  updatedFields: (keyof Block)[]
) {
  const now = Date.now();
  const updatedBlocks = getPendingBlockUpdates();
  const existing = updatedBlocks[blockId] || {};
  setItem(ArenaUpdatedBlocksKey, {
    ...updatedBlocks,
    [blockId]: {
      ...existing,
      ...Object.fromEntries(updatedFields.map((key) => [key, now])),
    },
  });
}

export function removePendingBlockUpdate(blockId: string) {
  const updatedBlocks = getPendingBlockUpdates();
  delete updatedBlocks[blockId];
  setItem(ArenaUpdatedBlocksKey, updatedBlocks);
}

export function rawArenaBlocksToBlockInsertInfo(
  arenaBlocks: RawArenaChannelItem[]
): DatabaseBlockInsert[] {
  return arenaBlocks.map(rawArenaBlockToBlockInsertInfo);
}

export function rawArenaBlockToBlockInsertInfo(
  block: RawArenaChannelItem
): DatabaseBlockInsert {
  if (
    !(
      block.attachment?.url ||
      // TODO: this is not defined... see arena.ts for example. at least for tiktok videos,
      // it only provides the html iframe code..
      block.embed?.url ||
      block.image?.display.url ||
      block.content
    )
  ) {
    console.error("MISSING CONTENT FOR ", block);
    logError(`MISSING CONTENT FOR ${block}`);
  }
  return {
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
  };
}
export function rawArenaBlockToBlock(block: RawArenaChannelItem): Block {
  return {
    id: block.id.toString(),
    ...rawArenaBlockToBlockInsertInfo(block),
    createdAt: new Date(block.created_at),
    updatedAt: new Date(block.updated_at),
    remoteConnectedAt: block.connected_at ? new Date(block.connected_at) : null,
    numConnections: 1,
    collectionIds: [],
  };
}

type CollectionFieldUpdate = {
  [k in keyof Collection]: number;
};
interface UpdatedCollections {
  [collectionId: string]: CollectionFieldUpdate;
}

export function getPendingCollectionUpdates(): UpdatedCollections {
  const updatedCollections = getItem<UpdatedCollections>(
    ArenaUpdatedChannelsKey
  );
  return updatedCollections || {};
}

export function recordPendingCollectionUpdate(
  collectionId: string,
  updatedFields: (keyof Collection)[]
) {
  const now = Date.now();
  const updatedCollections = getPendingCollectionUpdates();
  const existing = updatedCollections[collectionId] || {};
  setItem(ArenaUpdatedChannelsKey, {
    ...updatedCollections,
    [collectionId]: {
      ...existing,
      ...Object.fromEntries(updatedFields.map((key) => [key, now])),
    },
  });
}

export function removePendingCollectionUpdate(collectionId: string) {
  const updatedCollections = getPendingCollectionUpdates();
  delete updatedCollections[collectionId];
  setItem(ArenaUpdatedChannelsKey, updatedCollections);
}

export async function updateArenaChannel({
  channelId,
  arenaToken,
  title,
  description,
  status,
}: {
  channelId: string;
  arenaToken: string;
  title?: string;
  description?: string;
  status?: ArenaVisibility;
}) {
  console.log("updating channel", channelId, title, description, status);
  const updateMetadata = await fetch(ArenaGraphqlApi, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${arenaToken}`,
      "Content-Type": "application/json",
      "X-APP-TOKEN": ArenaGraphqlKey,
    },
    body: JSON.stringify({
      query: updateChannelMutation,
      variables: {
        id: channelId,
        title,
        description,
        status,
      },
    }),
  });
  if (!updateMetadata.ok) {
    logError(
      `failed to update block metadata in arena ${
        updateMetadata.status
      }: ${JSON.stringify(updateMetadata)}`
    );
  }
  return updateMetadata;
}

const updateChannelMutation = `
  mutation updateChannelMutation(
    $id: ID!
    $title: String
    $description: String
    $visibility: ChannelVisibility
    $content_flag: ContentFlag
    $owner: ChannelMemberInput
  ) {
    update_channel(
      input: {
        id: $id
        title: $title
        description: $description
        visibility: $visibility
        content_flag: $content_flag
        owner: $owner
      }
    ) {
      channel {
        ...ManageChannel
      }
    }
  }
  fragment ManageChannel on Channel {
    id
    href
    title
    description(format: MARKDOWN)
    visibility
    content_flag
    can {
      destroy
      export
    }
    user {
      id
    }
    owner {
      __typename
      ... on User {
        id
      }
      ... on Group {
        id
      }
    }
    ...TransferChannel
  }
  fragment TransferChannel on Channel {
    id
    can {
      transfer
    }
    is_pending_transfer
    transfer_request {
      recipient {
        __typename
        ... on User {
          id
          name
        }
        ... on Group {
          id
          name
        }
      }
      is_recipient_member
    }
    visibility
  }
`;
