import { Paragraph } from "tamagui";
import { Block } from "../utils/db";
import { MimeType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";

export function BlockContent({
  type,
  content,
}: Pick<Block, "type" | "content">) {
  switch (type) {
    case MimeType[".txt"]:
      return <Paragraph>{content}</Paragraph>;
    default:
      return (
        // width+height 100% so dumb, only needed because react native for some reason default renders a wrapper div and then the image tag..
        <MediaView
          media={content}
          mimeType={type}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      );
  }
}
