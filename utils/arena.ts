import { Block } from "./db";
import * as FileSystem from "expo-file-system";
import { BlockType, MimeType } from "./mimeTypes";

export const ArenaClientId = "tnJRHmJZWUxJ3EG6OAraA_LoSjdjq2oiF_TbZFrUTIE";
// TODO: move these before open sourcing repo
export const ArenaClientSecret = "jSpLG7pclKUxa_QcIfg6iv057TMK2Wz-Ma4f99ly9F0";
export const ArenaTokenStorageKey = "arena-token";

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
  contents: RawArenaItem[];
}
export type ArenaClass = "Image" | "Text" | "Link" | "Media" | "Attachment";
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
  const { page, length, per } = response;
  if (page * per < length) {
    return apiUrl(baseUrl, path, { ...params, page: page + 1 });
  }
}

const ArenaApiUrlBase = "https://api.are.na/v2/channels/";
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
  if (maybeChannelUrl.startsWith(ArenaApiUrlBase)) {
    return maybeChannelUrl;
  }

  const channel = maybeParseChannelIdentifierFromUrl(maybeChannelUrl);
  return ArenaApiUrlBase + channel;
}

// TODO: this should use users access token if they added it
export async function getChannelContents(
  url: string
): Promise<ArenaChannelInfo> {
  const reviewItemSourceTransformed = transformChannelUrlToApiUrl(url);
  let fetchedItems: RawArenaItem[] = [];
  const baseUrl = reviewItemSourceTransformed;
  let channelInfo = {};
  let isFirstFetch = true;
  try {
    let nextUrl: string | undefined = baseUrl;
    while (nextUrl) {
      console.log("paging", nextUrl);
      const resp = await fetch(nextUrl);
      const respBody = await resp.json();
      if (isFirstFetch) {
        const { contents, ...rest } = respBody;
        channelInfo = rest as ArenaChannelInfo;
        isFirstFetch = false;
      }
      let contents: RawArenaItem[] = respBody.contents;
      // TODO: recursively traverse the sub-channels
      contents = contents.filter((c) => c.base_class === "Block");
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

export function arenaClassToBlockType({
  class: classVal,
  embed,
  attachment,
  image,
}: RawArenaItem): BlockType {
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
      const imgurResp = await resp.json();
      if (!resp.ok) {
        throw new Error(JSON.stringify(imgurResp));
      }
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
}): Promise<string> {
  const url = `${ArenaApiUrlBase}${channelId}/blocks`;
  const body = await getBodyForBlock(block);
  console.log("adding block to channel", channelId, body, arenaToken, url);
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${arenaToken}`,
      "Content-Type": "application/json",
    },
  });
  const response = await resp.json();
  if (!resp.ok) {
    console.error(`failed to add block to arena channel ${resp.status}`, resp);
    throw new Error(JSON.stringify(response));
  }

  return response.id;
}
