import { Paragraph, YStack, YStackProps, useTheme } from "tamagui";
import { StyleSheet } from "react-native";
import { Block } from "../utils/db";
import { MimeType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";

export function BlockContent({
  type,
  content,
  title,
  description,
  containerStyle,
  mediaStyle: style,
  textContainerProps = {},
}: Block & {
  containerStyle?: object;
  mediaStyle?: object;
  textContainerProps?: YStackProps;
}) {
  const theme = useTheme();
  let renderedContent;
  let containerProps = {};

  switch (type) {
    case MimeType[".txt"]:
      renderedContent = <Paragraph>{content}</Paragraph>;
      containerProps = {
        borderColor: theme.color.get(),
        backgroundColor: theme.background.get(),
        borderWidth: 1,
        padding: 12,
        ...textContainerProps,
      };
      break;
    case MimeType["link"]:
      renderedContent = (
        <MediaView
          media={content}
          mimeType={type}
          style={style}
          alt={`Image ${title} ${description}`}
        />
      );
      break;
    default:
      renderedContent = (
        <MediaView
          media={content}
          mimeType={type}
          style={style}
          alt={`Image ${title} ${description}`}
        />
      );
      break;
  }

  return (
    <YStack style={(styles.block, containerStyle)} {...containerProps}>
      {renderedContent}
    </YStack>
  );
}

const styles = StyleSheet.create({
  block: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
});
