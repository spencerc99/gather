import { MimeType } from "./mimeTypes";

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
export type ArenaClass = "Image" | "Text" | "Link";
export interface RawArenaItem {
  id: string;
  title: string;
  content: string;
  content_html: string;
  description_html: string;
  description: string;
  image: {
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
const ArenaChannelRegex = /(?:https:\/\/)?(?:www\.)?are\.na\/[\w-]+\/([\w-]+)/;

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

export function arenaClassToMimeType(classVal: ArenaClass): MimeType {
  switch (classVal) {
    case "Image":
      return MimeType[".png"];
    case "Text":
      return MimeType[".txt"];
    case "Link":
      return MimeType["link"];
  }
}
