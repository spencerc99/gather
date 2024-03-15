import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import * as WebBrowser from "expo-web-browser";
import { BlockType } from "../utils/mimeTypes";
import { Platform, Pressable, StyleSheet } from "react-native";
import { HoldItem } from "react-native-hold-menu";
import {
  PropsWithChildren,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Icon,
  IconComponent,
  StyledParagraph,
  StyledText,
  StyledView,
} from "./Themed";
import { BlockContent } from "./BlockContent";
import {
  GetProps,
  TextProps,
  XStack,
  YStack,
  YStackProps,
  useTheme,
} from "tamagui";
import { getRelativeDate } from "../utils/date";
import { Link, useRouter } from "expo-router";
import { ExternalLink } from "./ExternalLink";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import { MenuItemProps } from "react-native-hold-menu/lib/typescript/components/menu/types";
import { jsxJoin } from "../utils/react";

function useBlockMenuItems(
  block: Block,
  { onClickEdit }: { onClickEdit?: () => void } = {}
): {
  blockMenuItems: MenuItemProps[];
} {
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
              onPress: () => {
                WebBrowser.openBrowserAsync(source!);
              },
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
                    break;

                  case BlockType.Link:
                    await Clipboard.setUrlAsync(source!);
                    break;

                  case BlockType.Image:
                  case BlockType.Video:
                    const base64 = await FileSystem.readAsStringAsync(content, {
                      encoding: "base64",
                    });
                    Clipboard.setImageAsync(base64);
                    break;

                  case BlockType.Audio:
                  case BlockType.Document:
                    throw new Error("unsupported copy");
                }
              },
            },
          ]),
      ...(type === BlockType.Text && onClickEdit
        ? [
            {
              text: "Edit",
              icon: () => <Icon name="edit" />,
              onPress: () => {
                onClickEdit();
              },
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
  shouldLink,
  style,
  blockStyle,
  containerProps,
}: {
  block: Block;
  hideMetadata?: boolean;
  hideHoldMenu?: boolean;
  shouldLink?: boolean;
  style?: object;
  blockStyle?: object;
  containerProps?: GetProps<typeof YStack>;
}) {
  const { id, title, createdAt } = block;
  const { updateBlock } = useContext(DatabaseContext);
  const [isEditing, setIsEditing] = useState(false);

  async function commitEdit(newContent: string | null) {
    try {
      if (newContent !== null) {
        await updateBlock(id, { content: newContent });
      }
    } catch (err) {
      console.error(err);
      // TODO: toast with error;
    } finally {
      setIsEditing(false);
    }
  }

  const { blockMenuItems } = useBlockMenuItems(block, {
    onClickEdit: () => setIsEditing(true),
  });

  const renderedBlockContent = (
    <BlockContent
      {...block}
      isEditing={isEditing}
      commitEdit={commitEdit}
      containerStyle={style}
      textContainerProps={{
        minWidth: "100%",
      }}
      mediaStyle={{
        aspectRatio: 1,
        borderRadius: "$2",
        ...blockStyle,
      }}
    />
  );

  function renderMetadata() {
    const {
      type,
      createdAt,
      remoteConnectedAt,
      source,
      numConnections,
      remoteSourceInfo,
    } = block;

    const relativeDate = getRelativeDate(
      remoteConnectedAt ? new Date(remoteConnectedAt) : createdAt
    );
    let metadata = [<>{relativeDate}</>];
    switch (type) {
      case BlockType.Link:
        metadata.push(
          <>
            from <ExternalLink href={source!}>{source}</ExternalLink>
          </>
        );
        break;
    }

    return (
      <StyledText metadata ellipse={true} textAlign="right">
        {jsxJoin(" • ", metadata)}
      </StyledText>
    );
  }

  const renderedSummary = (
    <YStack gap="$2" alignItems="center" key={id} {...containerProps}>
      {hideHoldMenu ? (
        renderedBlockContent
      ) : (
        <HoldItem items={blockMenuItems} closeOnTap>
          {renderedBlockContent}
        </HoldItem>
      )}
      {!hideMetadata && renderMetadata()}
    </YStack>
  );

  return shouldLink && !isEditing ? (
    <Link
      href={{
        pathname: "/block/[id]/",
        params: { id: block.id },
      }}
      key={block.id}
      asChild
    >
      <Pressable>{renderedSummary}</Pressable>
    </Link>
  ) : (
    renderedSummary
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
  shouldLink,
  style,
  blockStyle,
  isRemoteCollection,
  containerProps,
}: {
  block: Block;
  shouldLink?: boolean;
  hideMetadata?: boolean;
  style?: object;
  blockStyle?: object;
  isRemoteCollection?: boolean;
  containerProps?: GetProps<typeof YStack>;
}) {
  const { id, type, source, title, description } = block;
  const theme = useTheme();
  const { updateBlock } = useContext(DatabaseContext);
  const [isEditing, setIsEditing] = useState(false);
  const widthProperty = blockStyle?.width || 250;

  const showBackground =
    [BlockType.Text, BlockType.Link].includes(type) ||
    ([BlockType.Image].includes(type) && Boolean(title));

  async function commitEdit(newContent: string | null) {
    try {
      if (newContent !== null) {
        await updateBlock(id, { content: newContent });
      }
    } catch (err) {
      console.error(err);
      // TODO: toast with error;
    } finally {
      setIsEditing(false);
    }
  }

  const { blockMenuItems } = useBlockMenuItems(block, {
    onClickEdit: () => {
      setIsEditing(true);
    },
  });

  function renderContent() {
    const content = (
      <BlockContent
        key={id}
        {...block}
        isEditing={isEditing}
        commitEdit={commitEdit}
        containerStyle={style}
        mediaStyle={{
          width: widthProperty,
          maxWidth: widthProperty,
          borderRadius: "$2",
          ...blockStyle,
        }}
        textContainerProps={{
          // borderWidth: 1,
          borderRadius: "$2",
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
          // TODO: don't render content for link without image (content === '')
          <YStack>
            {content}
            <YStack
              alignItems="flex-end"
              maxWidth={widthProperty}
              flexShrink={1}
              paddingHorizontal="$2"
              paddingVertical="$1"
            >
              <StyledText ellipse={true}>{title}</StyledText>
              <StyledText metadata ellipse={true}>
                {source}
              </StyledText>
            </YStack>
          </YStack>
        );

        return inner;
      case BlockType.Image:
        if (title) {
          return (
            <YStack>
              {content}
              <YStack
                alignItems="flex-end"
                maxWidth={widthProperty}
                flexShrink={1}
                paddingHorizontal="$2"
                paddingVertical="$1"
              >
                <StyledText ellipse={true}>{title}</StyledText>
                <StyledText metadata ellipse={true} numberOfLines={1}>
                  {description}
                </StyledText>
              </YStack>
            </YStack>
          );
        }
      default:
        return content;
    }
  }

  const renderedSummary = useMemo(
    () => (
      <YStack space="$1" {...containerProps}>
        <HoldItem items={blockMenuItems} closeOnTap>
          <StyledView
            backgroundColor={showBackground ? "$gray6" : undefined}
            borderRadius="$4"
            height="auto"
          >
            {renderContent()}
          </StyledView>
        </HoldItem>
        {!hideMetadata && (
          <BlockMetadata
            block={block}
            textProps={{ textAlign: "right" }}
            isRemoteCollection={isRemoteCollection}
          />
        )}
      </YStack>
    ),
    [
      block,
      hideMetadata,
      isRemoteCollection,
      showBackground,
      blockMenuItems,
      isEditing,
      blockStyle,
      containerProps,
    ]
  );
  return shouldLink && !isEditing ? (
    <Link
      href={{
        pathname: "/block/[id]/",
        params: { id: block.id },
      }}
      key={block.id}
      asChild
    >
      <Pressable>{renderedSummary}</Pressable>
    </Link>
  ) : (
    renderedSummary
  );
}

export function BlockReviewSummary({
  block,
  hideMetadata,
  shouldLink,
  style,
  blockStyle,
  isRemoteCollection,
  containerProps,
}: {
  block: Block;
  shouldLink?: boolean;
  hideMetadata?: boolean;
  style?: object;
  blockStyle?: object;
  isRemoteCollection?: boolean;
  containerProps?: GetProps<typeof YStack>;
}) {
  const { id, type, source, title, description } = block;
  const theme = useTheme();
  const widthProperty = blockStyle?.width || 250;

  const showBackground =
    [BlockType.Link].includes(type) ||
    ([BlockType.Image].includes(type) && Boolean(title));

  const { blockMenuItems } = useBlockMenuItems(block);

  function renderContent() {
    // if (!block.content && block.type === BlockType.Link) {
    //   return null;
    // }
    const content = (
      <BlockContent
        key={id}
        {...block}
        containerStyle={style}
        mediaStyle={{
          width: widthProperty,
          borderRadius: "$2",
          ...blockStyle,
        }}
        textContainerProps={{
          // borderWidth: 1,
          borderRadius: "$2",
          borderColor: theme.color.get(),
          space: "$2",
          padding: "$3",
          width: "100%",
        }}
      />
    );
    switch (type) {
      default:
        return (
          // TODO: don't render content for link without image (content === '')
          <YStack>
            {content}
            {(description || source) && (
              <YStack
                maxWidth={widthProperty}
                flexShrink={1}
                paddingHorizontal="$2"
                paddingVertical="$2"
              >
                {source && (
                  <StyledText metadata ellipse={true}>
                    {source}
                  </StyledText>
                )}
                {description && (
                  <StyledText ellipse={true} numberOfLines={3}>
                    {description}
                  </StyledText>
                )}
              </YStack>
            )}
          </YStack>
        );
    }
  }

  const renderedSummary = useMemo(
    () => (
      <YStack gap="$1.5" {...containerProps}>
        {title && (
          <StyledParagraph title textAlign="center">
            {title}
          </StyledParagraph>
        )}
        <HoldItem items={blockMenuItems} closeOnTap>
          <StyledView
            backgroundColor={showBackground ? "$gray6" : undefined}
            borderRadius="$4"
            height="auto"
            width="100%"
          >
            {renderContent()}
          </StyledView>
        </HoldItem>
        {!hideMetadata && <BlockConnections block={block} />}
      </YStack>
    ),
    [block, hideMetadata, isRemoteCollection, showBackground, blockMenuItems]
  );
  return shouldLink ? (
    <Link
      href={{
        pathname: "/block/[id]/",
        params: { id: block.id },
      }}
      key={block.id}
      asChild
    >
      <Pressable>{renderedSummary}</Pressable>
    </Link>
  ) : (
    renderedSummary
  );
}

export function BlockMetadata({
  block,
  textProps,
  isRemoteCollection,
}: {
  block: Block;
  textProps?: TextProps;
  isRemoteCollection?: boolean;
}) {
  const {
    type,
    createdAt,
    remoteConnectedAt,
    source,
    numConnections,
    remoteSourceInfo,
  } = block;

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
      const relativeDate = getRelativeDate(
        isRemoteCollection && remoteConnectedAt
          ? new Date(remoteConnectedAt)
          : createdAt
      );
      metadata = (
        <>
          {relativeDate}
          {"  "}
          {numConnections}{" "}
          <IconComponent name="link" size={12} color="$gray9" />
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

export function BlockConnections({ block }: { block: Block }) {
  const { collectionIds } = block;
  const { getCollection } = useContext(DatabaseContext);
  const [collectionsToShow, setCollectionsToShow] = useState<string[]>([]);

  useEffect(() => {
    Promise.all(
      (collectionIds || []).map(async (collectionId) => {
        const collection = await getCollection(collectionId);
        return collection?.title;
      })
    ).then((c) => setCollectionsToShow(c.filter(Boolean)));
  }, []);

  return (
    <StyledText metadata numberOfLines={3}>
      {collectionsToShow.map((c) => (
        <>
          <IconComponent name="link" size={12} color="$gray9" /> {c}
          {"  "}
        </>
      ))}
    </StyledText>
  );
}
