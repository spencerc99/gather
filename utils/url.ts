import urlMetadata from "url-metadata";

const UrlRegex =
  /^(http(s)?:\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

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

export async function extractDataFromUrl(url: string): Promise<UrlMetadata> {
  if (!isUrl(url)) {
    throw new Error("invalid url received");
  }

  const cleanedUrl = cleanUrl(url);
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
}
