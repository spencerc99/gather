import {
  GetProps,
  Paragraph,
  ParagraphProps,
  ScrollView,
  XStack,
  YStack,
  YStackProps,
  useTheme,
} from "tamagui";
import { StyleSheet } from "react-native";
import { Block } from "../utils/dataTypes";
import { BlockType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";
import {
  EditableTextOnClick,
  EditModeText,
  Icon,
  StyledButton,
  StyledTextArea,
} from "./Themed";
import { useState } from "react";
import { StyleProps } from "react-native-reanimated";

export function BlockContent({
  type,
  content,
  title,
  description,
  isEditing,
  commitEdit,
  containerStyle,
  mediaStyle: style,
  textContainerProps = {},
  textProps = {},
  isVisible,
}: Pick<Block, "type" | "content" | "title" | "description"> & {
  isEditing?: boolean;
  commitEdit?: (newContent: string | null) => Promise<void>;
  containerStyle?: object;
  mediaStyle?: StyleProps;
  textContainerProps?: YStackProps;
  textProps?: ParagraphProps;
  isVisible?: boolean;
}) {
  const theme = useTheme();
  let renderedContent;
  let containerProps = {};

  switch (type) {
    case BlockType.Text:
      renderedContent = (
        <ScrollView flexShrink={1} flexGrow={0}>
          <EditModeText
            text={content}
            // @ts-ignore
            commitEdit={commitEdit}
            editing={Boolean(isEditing)}
            textProps={textProps}
            multiline
          />
        </ScrollView>
      );
      containerProps = {
        borderColor: theme.color?.get(),
        backgroundColor: theme.background?.get(),
        borderWidth: 0.25,
        borderRadius: "$2",
        padding: 12,
        ...textContainerProps,
      };
      break;
    case BlockType.Link:
      renderedContent = (
        <MediaView
          media={content}
          blockType={type}
          alt={`Image ${title} ${description}`}
          style={
            style?.width || style?.height
              ? {
                  minWidth: style?.width,
                  minHeight: style?.height,
                  ...style,
                }
              : style
          }
          isVisible={isVisible}
        />
      );
      break;
    default:
      renderedContent = (
        <MediaView
          media={content}
          blockType={type}
          style={
            style?.width || style?.height
              ? {
                  minWidth: style?.width,
                  minHeight: style?.height,
                  ...style,
                }
              : style
          }
          alt={`Image ${title} ${description}`}
          isVisible={isVisible}
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
