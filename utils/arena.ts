import { Block, LastSyncedInfo } from "./dataTypes";
import { BlockType, MimeType } from "./mimeTypes";
import { logError } from "./errors";
import { withQueryParams } from "./url";
const XMLParser = require("react-xml-parser");
import { ArenaUpdatedBlocksKey, getItem, setItem } from "./asyncStorage";

export const ArenaClientId = process.env.EXPO_PUBLIC_ARENA_CLIENT_ID!;
export const ArenaClientSecret = process.env.EXPO_PUBLIC_ARENA_CLIENT_SECRET!;
export const ArenaGraphqlKey = process.env.EXPO_PUBLIC_ARENA_GRAPHQL_KEY!;
export const ArenaTokenStorageKey = "arena-token";

enum ArenaVisibility {
  Public = "public",
  Closed = "closed",
  Private = "private",
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
  username: string;
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
  | "Block";
export interface RawArenaChannelItem {
  id: string;
  title: string;
  content: string;
  content_html: string;
  description_html: string;
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
  url: string;
  base_class: "Block" | "Channel";
  class: ArenaClass;
  connected_at: string;
  connected_by_user_id: string;
  connected_by_username: string;
  connected_by_user_slug: string;
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
  user: RawArenaUser;
}

// Generated by https://quicktype.io
export interface RawArenaBlock {
  title: string;
  updated_at: string;
  created_at: string;
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
  embed: null;
  attachment: null;
  metadata: null;
  id: number;
  base_class: string;
  class: string;
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

export async function getChannelContents(
  channelId: string,
  {
    accessToken,
    lastSyncedInfo,
  }: { accessToken?: string | null; lastSyncedInfo?: LastSyncedInfo | null }
): Promise<RawArenaChannelItem[]> {
  console.log(
    "Fetching items for channel",
    channelId,
    ". Looking for items after ",
    lastSyncedInfo?.lastSyncedBlockCreatedAt
  );
  let fetchedItems: RawArenaChannelItem[] = [];
  let newItemsFound = lastSyncedInfo ? false : true;
  // TODO: fix as with below
  // const baseUrl = `${ArenaChannelsApi}/${channelId}/contents`;
  // TODO: this needs an API that only gets blocks AFTER given date.
  const baseUrl = `${ArenaChannelsApi}/${channelId}`;
  let numItemsFetched = 0;
  try {
    let nextUrl: string | undefined = baseUrl;
    while (nextUrl) {
      const resp = await fetch(nextUrl, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const respBody = await resp.json();
      let contents: RawArenaChannelItem[] = respBody.contents;
      // TODO: recursively traverse the sub-channels
      contents = contents.filter(
        // NOTE: class = block only if are.na has failed to process it
        (c) => c.base_class === "Block" && c.class !== "Block"
      );
      numItemsFetched += contents.length;

      if (
        lastSyncedInfo &&
        contents.some(
          (c) =>
            new Date(c.connected_at).getTime() >
            new Date(lastSyncedInfo.lastSyncedBlockCreatedAt).getTime()
        )
      ) {
        contents = contents.slice(
          contents.findIndex(
            (c) =>
              new Date(c.connected_at).getTime() >
              new Date(lastSyncedInfo.lastSyncedBlockCreatedAt).getTime()
          )
        );
        newItemsFound = true;
      }
      // Update storage with any new items
      if (newItemsFound) {
        fetchedItems.push(...contents);
      }
      // TODO: this is not working, debug and fix to reduce data fetched
      // const urlParams = Object.fromEntries(
      //   new URLSearchParams(nextUrl.split("?")[1])
      // );
      // console.log(urlParams);
      // nextUrl = nextUrlFromArenaContentsResponse(
      //   baseUrl,
      //   "",
      //   urlParams,
      //   respBody
      // );
      // console.log(nextUrl);
      nextUrl = nextUrlFromResponse(baseUrl, "", {}, respBody);
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
    const { contents, ...rest } = respBody;
    channelInfo = rest as ArenaChannelInfo;
  } catch (e) {
    logError(e);
    throw e;
  }
  return channelInfo as ArenaChannelInfo;
}

// TODO: this should use users access token if they added it
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
  contentType?: string;
}): FormData => {
  const formData = new FormData();

  if (contentType) {
    formData.append("Content-Type", contentType);
  }
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
      `failed to upload image to arena. no upload policy found with token ${accessToken} and key ${ArenaGraphqlKey}: ${JSON.stringify(
        resp
      )}`
    );
  }

  return respBody.data.me.policy;
}

export async function uploadFile({
  file,
  policy,
  contentType,
  onDone = () => {},
}: {
  file: { uri: string; name: string; type?: string };
  contentType?: string;
  policy: S3UploadPolicy;
  onDone?: (url: string) => any;
}): Promise<string> {
  const formData = buildFormDataFromFile({
    file,
    policy,
    contentType,
  });

  return fetch(policy.bucket, {
    method: "POST",
    body: formData,
  })
    .then((resp) => resp.text())
    .then((data) => {
      return parseLocationFromS3Response(data);
    })
    .then((url) => {
      return url;
    });
}

async function getBodyForBlock(
  block: Block,
  accessToken: string
): Promise<any> {
  const { type, title, content, source, contentType } = block;
  switch (type) {
    case BlockType.Text:
      return {
        content,
      };
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
        contentType,
      });
      console.log("Uploaded file to arena", url);

      return {
        source: url,
      };
    case BlockType.Link:
      return { source: source! };
    case BlockType.Audio:
    case BlockType.Document:
      throw new Error("unsupported type");
  }
}

export async function addBlockToChannel({
  channelId,
  block,
  arenaToken,
}: {
  channelId: string;
  block: Block;
  arenaToken: string;
}): Promise<RawArenaChannelItem> {
  let resp: Response;
  let response: RawArenaChannelItem;
  if (block.remoteSourceInfo?.arenaId) {
    // already exists in are.na just use a put
    // not documented in api docs, see https://discord.com/channels/691439466224549898/821954408643952650/825013461872017468
    const url = withQueryParams(
      `${ArenaChannelsApi}/${channelId}/connections`,
      {
        connectable_type: "Block",
        connectable_id: block.remoteSourceInfo.arenaId,
      }
    );
    console.log(
      `adding existing arena block ${block.remoteSourceInfo.arenaId} to channel`,
      channelId
    );
    resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${arenaToken}`,
        "Content-Type": "application/json",
      },
    });
    response = await resp.json();
  } else {
    const url = `${ArenaChannelsApi}/${channelId}/blocks`;
    const body = await getBodyForBlock(block, arenaToken);
    console.log("adding block to channel", channelId, body, arenaToken, url);
    resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${arenaToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      logError(
        `failed to add block to arena channel ${resp.status}: ${JSON.stringify(
          resp
        )}`
      );
      throw new Error(JSON.stringify(resp));
    }
    response = await resp.json();
    const { title, description } = block;
    if (title || description) {
      updateArenaBlock({
        blockId: response.id,
        arenaToken,
        title,
        description,
      });
    }
  }
  if (!resp.ok) {
    logError(
      `failed to add block to arena channel ${resp.status}: ${JSON.stringify(
        resp
      )}`
    );
    throw new Error(JSON.stringify(response));
  }

  return response;
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
      `failed to update block metadata in arena ${
        updateMetadata.status
      }: ${JSON.stringify(updateMetadata)}`
    );
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

async function getUserInfo(accessToken: string): Promise<RawArenaUser> {
  return await fetch(`${ArenaApiUrl}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((r) => r.json());
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
  const userInfo = await getUserInfo(accessToken);
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

// TODO: this doesn't set the remote_created_at on connection
export async function createChannel({
  accessToken,
  title,
  // TODO: make this a default setting in settings
  visibility = ArenaVisibility.Private,
  itemsToAdd,
}: {
  accessToken: string;
  title: string;
  visibility?: ArenaVisibility;
  itemsToAdd?: Block[];
}): Promise<{
  newChannel: ArenaChannelInfo;
  addedInfo: { id: string; connected_at: string; creator_slug: string }[];
  numItemsFailed: number;
}> {
  const url = `${ArenaApiUrl}/channels`;
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      title,
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

  const addedInfo = [];
  let numItemsFailed = 0;
  if (itemsToAdd?.length) {
    const { id } = maybeChannel;
    for (const block of itemsToAdd) {
      try {
        const item = await addBlockToChannel({
          channelId: id.toString(),
          block,
          arenaToken: accessToken,
        });
        addedInfo.push({
          id: block.id,
          connected_at: item.connected_at,
          creator_slug: item.user.slug,
        });
      } catch (e) {
        logError(e);
        numItemsFailed++;
      }
    }
  }

  return {
    newChannel: maybeChannel,
    addedInfo,
    numItemsFailed,
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
    logError(
      `failed to get block channels ${resp.status}: ${JSON.stringify(json)}`
    );
    throw new Error(JSON.stringify(json));
  }
  return json;
}

type FieldUpdate = {
  [k in keyof Block]: number;
};
interface UpdatedBlocks {
  [blockId: string]: FieldUpdate;
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
