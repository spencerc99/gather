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
import { Icon, StyledButton, StyledTextArea } from "./Themed";
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
}: Pick<Block, "type" | "content" | "title" | "description"> & {
  isEditing?: boolean;
  commitEdit?: (newContent: string | null) => Promise<void>;
  containerStyle?: object;
  mediaStyle?: StyleProps;
  textContainerProps?: YStackProps;
  textProps?: ParagraphProps;
}) {
  const theme = useTheme();
  let renderedContent;
  let containerProps = {};
  const [editableContent, setEditableContent] = useState(content);

  switch (type) {
    case BlockType.Text:
      renderedContent = (
        <ScrollView flexShrink={1} flexGrow={0}>
          {!isEditing ? (
            <Paragraph {...textProps}>{content}</Paragraph>
          ) : (
            <>
              <StyledTextArea
                value={editableContent}
                onChangeText={setEditableContent}
                minHeight={undefined}
                flex={1}
                enterKeyHint="done"
              />
              <StyledButton
                onPress={() => {
                  commitEdit?.(null);
                }}
                theme="gray"
                position="absolute"
                right="$1"
                bottom="$1"
                size="$xtiny"
                circular
                icon={<Icon name="close" />}
              />
            </>
          )}
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
