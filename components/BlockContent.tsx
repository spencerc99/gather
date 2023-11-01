import {
  Paragraph,
  ParagraphProps,
  ScrollView,
  YStack,
  YStackProps,
  useTheme,
} from "tamagui";
import { StyleSheet } from "react-native";
import { Block } from "../utils/db";
import { BlockType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";

export function BlockContent({
  type,
  content,
  title,
  description,
  containerStyle,
  mediaStyle: style,
  textContainerProps = {},
  textProps = {},
}: Pick<Block, "type" | "content" | "title" | "description"> & {
  containerStyle?: object;
  mediaStyle?: object;
  textContainerProps?: YStackProps;
  textProps?: ParagraphProps;
}) {
  const theme = useTheme();
  let renderedContent;
  let containerProps = {};

  switch (type) {
    case BlockType.Text:
      renderedContent = (
        <ScrollView flexShrink={1} flexGrow={0} maxHeight={"auto"}>
          <Paragraph {...textProps}>{content}</Paragraph>
        </ScrollView>
      );
      containerProps = {
        borderColor: theme.color.get(),
        backgroundColor: theme.background.get(),
        borderWidth: 1,
        padding: 12,
        ...textContainerProps,
      };
      break;
    case BlockType.Link:
      renderedContent = (
        <MediaView
          media={content}
          blockType={type}
          style={style}
          alt={`Image ${title} ${description}`}
        />
      );
      break;
    default:
      renderedContent = (
        <MediaView
          media={content}
          blockType={type}
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
