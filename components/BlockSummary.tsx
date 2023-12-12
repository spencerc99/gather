import { Block, DatabaseContext } from "../utils/db";
import * as WebBrowser from "expo-web-browser";
import { BlockType } from "../utils/mimeTypes";
import { Platform, StyleSheet } from "react-native";
import { HoldItem } from "react-native-hold-menu";
import { useContext, useMemo } from "react";
import { Icon, IconComponent, StyledText, StyledView } from "./Themed";
import { BlockContent } from "./BlockContent";
import { TextProps, XStack, YStack, useTheme } from "tamagui";
import { getRelativeDate } from "../utils/date";
import { useRouter } from "expo-router";
import { ExternalLink } from "./ExternalLink";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import { MenuItemProps } from "react-native-hold-menu/lib/typescript/components/menu/types";

function useBlockMenuItems(block: Block): { blockMenuItems: MenuItemProps[] } {
  const { deleteBlock } = useContext(DatabaseContext);
  const router = useRouter();
  const { id, source, content, type } = block;

  const blockMenuItems = useMemo(
    () => [
      { text: "Actions", isTitle: true },
      ...(source
        ? [
            {
              text: "View Source",
              icon: () => <Icon name={"external-link"} />,
              onPress: () => console.log("View Source"),
            },
          ]
        : []),
      {
        text: "Details",
        icon: () => <Icon name="expand" />,
        onPress: () => {
          router.push({
            pathname: "/block/[id]/",
            params: { id },
          });
        },
      },
      ...([BlockType.Audio, BlockType.Document].includes(type)
        ? []
        : [
            {
              text: "Copy",
              icon: () => <Icon name="copy" />,
              onPress: async () => {
                switch (type) {
                  case BlockType.Text:
                    await Clipboard.setStringAsync(content);
                  case BlockType.Link:
                    await Clipboard.setUrlAsync(source!);
                  case BlockType.Image:
                  case BlockType.Video:
                    const base64 = await FileSystem.readAsStringAsync(content, {
                      encoding: "base64",
                    });
                    Clipboard.setImageAsync(base64);
                  case BlockType.Audio:
                  case BlockType.Document:
                    throw new Error("unsupported copy");
                }
              },
            },
          ]),
      // TODO: finish this
      // set isEditing and pass that and a commitEdit function out of here for the consumer to handle
      ...(__DEV__
        ? [
            {
              text: "Edit",
              icon: () => <Icon name="edit" />,
              onPress: () => {},
            },
          ]
        : []),
      {
        text: "Connect",
        icon: () => <Icon name="link" />,
        onPress: () => {
          router.push({
            pathname: "/block/[id]/connect",
            params: { id },
          });
        },
      },
      {
        text: "Delete",
        icon: () => <Icon name={"trash"} />,
        isDestructive: true,
        // TODO: add confirmation dialog
        onPress: () => deleteBlock(id),
      },
    ],
    [id, source, content, deleteBlock]
  );

  return { blockMenuItems };
}

export function BlockSummary({
  block,
  hideMetadata,
  hideHoldMenu,
  style,
  blockStyle,
}: {
  block: Block;
  hideMetadata?: boolean;
  hideHoldMenu?: boolean;
  style?: object;
  blockStyle?: object;
}) {
  const { id, title, createdAt } = block;
  const { blockMenuItems } = useBlockMenuItems(block);

  const theme = useTheme();
  const renderedBlockContent = (
    <BlockContent
      {...block}
      containerStyle={style}
      mediaStyle={{
        aspectRatio: 1,
        ...blockStyle,
      }}
    />
  );

  return (
    <YStack space="$1" alignItems="center" key={id}>
      {hideHoldMenu ? (
        renderedBlockContent
      ) : (
        <HoldItem items={blockMenuItems} closeOnTap>
          {renderedBlockContent}
        </HoldItem>
      )}
      {!hideMetadata && (
        <StyledText metadata ellipse={true}>
          {title ? `${title}` : `${getRelativeDate(createdAt)}`}
        </StyledText>
      )}
    </YStack>
  );
}

// export const BlockSummary = styled(BlockSummaryBase, {
//   variants: {
//     size: {
//       small: {
//         style: { width: 60, height: 60 },
//       },
//       medium: {
//         style: { width: 150, height: 150 },
//       },
//       large: {
//         style: { width: 400, height: 400 },
//       },
//     },
//   } as const,
// });

export function BlockTextSummary({
  block,
  hideMetadata,
  style,
  blockStyle,
}: {
  block: Block;
  hideMetadata?: boolean;
  style?: object;
  blockStyle?: object;
}) {
  const { id, type, source, title } = block;
  const theme = useTheme();
  const { blockMenuItems } = useBlockMenuItems(block);

  function renderContent() {
    const content = (
      <BlockContent
        key={id}
        {...block}
        containerStyle={style}
        mediaStyle={{
          width: 250,
          borderRadius: 4,
          ...blockStyle,
        }}
        textContainerProps={{
          borderWidth: 1,
          borderRadius: 4,
          borderColor: theme.color.get(),
          space: "$2",
          padding: "$3",
          width: "100%",
        }}
      />
    );
    switch (type) {
      case BlockType.Link:
        const inner = (
          <YStack>
            {content}
            <YStack alignItems="flex-end" paddingBottom="$1" maxWidth={250}>
              <StyledText ellipse={true}>{title}</StyledText>
              <StyledText metadata ellipse={true}>
                {source}
              </StyledText>
            </YStack>
          </YStack>
        );
        return source ? (
          <ExternalLink href={source}>{inner}</ExternalLink>
        ) : (
          inner
        );
      default:
        return content;
    }
  }

  return (
    <YStack space="$1">
      <HoldItem items={blockMenuItems} closeOnTap>
        <StyledView backgroundColor="$gray6" borderRadius="$4">
          {renderContent()}
        </StyledView>
      </HoldItem>
      {!hideMetadata && (
        <BlockMetadata block={block} textProps={{ textAlign: "right" }} />
      )}
    </YStack>
  );
}

export function BlockMetadata({
  block,
  textProps,
}: {
  block: Block;
  textProps?: TextProps;
}) {
  const { type, createdAt, source, numConnections } = block;

  let metadata;
  switch (type) {
    // case BlockType.Link:
    //   metadata = (
    //     <>
    //       from <ExternalLink href={source!}>{source}</ExternalLink>
    //     </>
    //   );
    //   break;
    default:
      const relativeDate = getRelativeDate(createdAt);
      metadata = (
        <>
          {relativeDate}
          {"  "}
          {numConnections} <IconComponent name="link" size={12} color="grey9" />
        </>
      );
      break;
  }

  return (
    <StyledText metadata ellipse={true} textAlign="right">
      {metadata}
    </StyledText>
  );
}
