import { Paragraph, YStack, YStackProps } from "tamagui";
import { Block } from "../utils/db";
import { MimeType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";

export function BlockContent({
  type,
  content,
  style,
  textContainerProps = {},
}: Pick<Block, "type" | "content"> & {
  style?: object;
  textContainerProps?: YStackProps;
}) {
  switch (type) {
    case MimeType[".txt"]:
      return (
        <YStack {...textContainerProps}>
          <Paragraph>{content}</Paragraph>
        </YStack>
      );
    default:
      return (
        // width+height 100% so dumb, only needed because react native for some reason default renders a wrapper div and then the image tag..
        <MediaView media={content} mimeType={type} style={style} />
      );
  }
}
