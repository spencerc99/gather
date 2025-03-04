export enum BlockType {
  Image = "image",
  Video = "video",
  Audio = "audio",
  Document = "document",
  Text = "text",
  Link = "link",
}
export const FileBlockTypes = [
  BlockType.Image,
  BlockType.Document,
  BlockType.Audio,
  BlockType.Video,
];

const VideoFileExtensions = [".mp4", ".mov", ".webm", ".m4v"];
export function isBlockContentVideo(
  content: string,
  blockType: BlockType
): boolean {
  const maybeUrl = blockType === BlockType.Document ? new URL(content) : null;
  const mediaIsVideo =
    blockType === BlockType.Document &&
    VideoFileExtensions.some(
      (ext) => content.endsWith(ext) || maybeUrl?.pathname?.endsWith(ext)
    );
  return mediaIsVideo;
}

// TODO: convert mimetype to contentype
export enum MimeType {
  // TODO:
  "link" = "link",
  "embed" = "embed",
  ".aac" = "audio/aac",
  ".avi" = "video/x-msvideo",
  ".bin" = "application/octet-stream",
  ".bmp" = "image/bmp",
  ".css" = "text/css",
  ".csv" = "text/csv",
  ".eot" = "application/vnd.ms-fontobject",
  ".epub" = "application/epub+zip",
  ".gz" = "application/gzip",
  ".gif" = "image/gif",
  ".htm" = "text/html",
  ".html" = "text/html",
  ".jpg" = "image/jpeg",
  ".jpeg" = "image/jpeg",
  ".json" = "application/json",
  ".jsonld" = "application/ld+json",
  ".mid" = "audio/midi",
  ".mjs" = "text/javascript",
  ".mov" = "video/quicktime",
  ".mp3" = "audio/mpeg",
  ".ma4" = "audio/mp4",
  ".mp4" = "video/mp4",
  ".mpeg" = "video/mpeg",
  ".opus" = "audio/opus",
  ".otf" = "font/otf",
  ".png" = "image/png",
  ".pdf" = "application/pdf",
  ".sh" = "application/x-sh",
  ".svg" = "image/svg+xml",
  ".tif" = "image/tiff",
  ".tiff" = "image/tiff",
  ".ts" = "video/mp2t",
  ".ttf" = "font/ttf",
  ".txt" = "text/plain",
  ".wav" = "audio/wav",
  ".weba" = "audio/webm",
  ".webm" = "video/webm",
  ".webp" = "image/webp",
  ".woff" = "font/woff",
  ".woff2" = "font/woff2",
  ".xml" = "application/xml",
}

export function isImageType(mimeType: MimeType): boolean {
  return mimeType.startsWith("image");
}
