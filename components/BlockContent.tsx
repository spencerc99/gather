import { Paragraph, YStack, YStackProps } from "tamagui";
import { Block } from "../utils/db";
import { MimeType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";

export function BlockContent({
  type,
  content,
  title,
  description,
  style,
  textContainerProps = {},
}: Block & {
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
    case MimeType["link"]:
      return (
        <MediaView
          media={content}
          mimeType={type}
          style={style}
          alt={`Image ${title} ${description}`}
        />
      );
    default:
      return (
        <MediaView
          media={content}
          mimeType={type}
          style={style}
          alt={`Image ${title} ${description}`}
        />
      );
  }
}
