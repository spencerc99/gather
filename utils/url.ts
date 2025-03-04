import urlMetadata from "url-metadata";
import { logError } from "./errors";

const UrlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;

export function cleanUrl(url: string): string {
  return url.trim();
}

export function isUrl(maybeUrl: string): boolean {
  return UrlRegex.test(cleanUrl(maybeUrl));
}

interface UrlMetadata {
  title?: string;
  description?: string;
  images?: string[];
  favicon?: string;
  url: string;
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

export async function extractDataFromUrl(url: string): Promise<UrlMetadata> {
  if (!isUrl(url)) {
    throw new Error("invalid url received");
  }

  const cleanedUrl = cleanUrl(url);
  try {
    const response = await urlMetadata(cleanedUrl);
    let data: UrlMetadata = {
      title: (response.title || response["og:title"]) as string,
      description: (response.description ||
        response["og:description"] ||
        response["twitter:description"]) as string,
      images: [
        response.image,
        response["og:image"],
        response["twitter:image"],
      ].filter((image) => Boolean(image)) as string[],
      // @ts-ignore
      favicon: response["favicons"]?.[0]?.href as string,
      url: cleanedUrl,
    };
    // TODO: maybe use iframely here
    return data as UrlMetadata;
  } catch (err) {
    logError(err);
    return {
      url: cleanedUrl,
    };
  }
}
