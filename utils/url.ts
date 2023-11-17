import { getFsPathForMediaResult, getFsPathForRemoteImage } from "./blobs";

const UrlRegex =
  /^(http(s)?:\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

export function cleanUrl(url: string): string {
  return url.trim().toLowerCase();
}

export function isUrl(maybeUrl: string): boolean {
  return UrlRegex.test(cleanUrl(maybeUrl));
}

interface UrlMetadata {
  title?: string;
  description?: string;
  images?: string[];
  favicon?: string;
  domain: string;
  url: string;
}

export async function extractDataFromUrl(url: string): Promise<UrlMetadata> {
  if (!isUrl(url)) {
    throw new Error("invalid url received");
  }

  const cleanedUrl = cleanUrl(url);

  const response = await fetch(
    `https://jsonlink.io/api/extract?url=${cleanedUrl}`
  );
  const data = await response.json();
  if (!data.images?.length) {
    // TODO: create a custom service for this? or only do it optionally? how to handle this in local-first context.. maybe never store?
    // TODO: pass in url as filename?
    const siteImageFileUrl = await getFsPathForRemoteImage(
      `http://image.thum.io/get/auth/69503-gather/${cleanedUrl}`
    );
    data.images = [siteImageFileUrl];
  }

  console.log(data);
  if (!data.url) {
    data.url = url;
  }

  return data as UrlMetadata;
}
