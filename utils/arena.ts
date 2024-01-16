import * as FileSystem from "expo-file-system";
import { Block, LastSyncedInfo } from "./dataTypes";
import { BlockType, MimeType } from "./mimeTypes";
import { UserInfo } from "./user";

export const ArenaClientId = process.env.EXPO_PUBLIC_ARENA_CLIENT_ID;
export const ArenaClientSecret = process.env.EXPO_PUBLIC_ARENA_CLIENT_SECRET;
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
  contents: RawArenaItem[];
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
export interface RawArenaItem {
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
}

export function withQueryParams(url: string, params: { [key: string]: any }) {
  return (
    url +
    "?" +
    Object.entries(params)
      .map(([key, paramValue]) => `${key}=${encodeURIComponent(paramValue)}`)
      .join("&")
  );
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
): Promise<RawArenaItem[]> {
  console.log(
    "Fetching items for channel",
    channelId,
    ". Looking for items after ",
    lastSyncedInfo?.lastSyncedBlockCreatedAt
  );
  let fetchedItems: RawArenaItem[] = [];
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
      let contents: RawArenaItem[] = respBody.contents;
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
    console.error(e);
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
    console.error(e);
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
  let fetchedItems: RawArenaItem[] = [];
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
      let contents: RawArenaItem[] = respBody.contents;
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
    console.error(e);
    throw e;
  }
  return { ...channelInfo, contents: fetchedItems } as ArenaChannelInfo;
}

export function arenaClassToBlockType(arenaItem: RawArenaItem): BlockType {
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
}: RawArenaItem): MimeType | undefined {
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

async function getBodyForBlock(block: Block): Promise<any> {
  const { type, content, source } = block;
  switch (type) {
    case BlockType.Text:
      return {
        content,
      };
    case BlockType.Image:
    case BlockType.Video:
      const base64 = await FileSystem.readAsStringAsync(content, {
        encoding: "base64",
      });
      // upload to imgur
      const formData = new FormData();
      formData.append("type", "base64");
      if (type === BlockType.Image) {
        formData.append("image", base64);
      } else {
        formData.append("video", base64);
      }
      const resp = await fetch("https://api.imgur.com/3/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Client-ID 0d8e6e0a1331d71`,
        },
      });
      if (!resp.ok) {
        throw new Error(JSON.stringify(resp));
      }
      const imgurResp = await resp.json();
      return {
        source: imgurResp.data.link,
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
}): Promise<RawArenaItem> {
  let resp: Response;
  let response: RawArenaItem;
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
    const body = await getBodyForBlock(block);
    console.log("adding block to channel", channelId, body, arenaToken, url);
    resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${arenaToken}`,
        "Content-Type": "application/json",
      },
    });
    response = await resp.json();
    const { title, description } = block;
    if (title || (description && resp.ok)) {
      const body = {
        title,
        description,
      };
      // ignore undefined values
      Object.keys(body).forEach((key) => {
        // @ts-ignore
        if (!body[key]) body[key] = "";
      });
      const url = withQueryParams(`${ArenaApiUrl}/blocks/${response.id}`, body);
      const updateMetadata = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${arenaToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!updateMetadata.ok) {
        console.error(
          `failed to update block metadata in arena ${updateMetadata.status}`,
          updateMetadata
        );
      }
    }
  }
  if (!resp.ok) {
    console.error(`failed to add block to arena channel ${resp.status}`, resp);
    throw new Error(JSON.stringify(response));
  }

  return response;
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
    console.error(
      `failed to remove block from arena channel ${resp.status}`,
      JSON.stringify(response)
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
    console.error(e);
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
  addedInfo: { id: string; connected_at: string }[];
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
    console.error(`failed to create channel ${resp.status}`, maybeChannel);
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
        });
      } catch (e) {
        console.error(e);
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

class ArenaSyncManager {
  arenaAccessToken: string | null = null;
  currentUser: UserInfo | null = null;
  syncWithArena: () => void = () => {};

  init({
    arenaAccessToken,
    currentUser,
    syncWithArena,
  }: {
    arenaAccessToken: string | null;
    currentUser: UserInfo | null;
    syncWithArena: () => void;
  }) {
    this.arenaAccessToken = arenaAccessToken;
    this.currentUser = currentUser;
    this.syncWithArena = syncWithArena;
  }

  sync() {
    if (this.arenaAccessToken && this.currentUser) {
      console.log("syncing with arena");
      this.syncWithArena();
    }
  }
}

export const ArenaSyncManagerSingleton: ArenaSyncManager =
  new ArenaSyncManager();
