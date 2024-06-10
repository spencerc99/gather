import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import * as WebBrowser from "expo-web-browser";
import { BlockType } from "../utils/mimeTypes";
import { Pressable } from "react-native";
import { HoldItem } from "react-native-hold-menu";
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  EditableTextOnClick,
  Icon,
  IconComponent,
  IconType,
  StyledParagraph,
  StyledText,
  StyledView,
} from "./Themed";
import { BlockContent } from "./BlockContent";
import { GetProps, Image, TextProps, XStack, YStack, useTheme } from "tamagui";
import { getRelativeDate } from "../utils/date";
import { Link, router, useRouter } from "expo-router";
import { ExternalLink } from "./ExternalLink";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import { MenuItemProps } from "react-native-hold-menu/lib/typescript/components/menu/types";
import { ensureUnreachable, jsxJoin } from "../utils/react";
import { StyleProps } from "react-native-reanimated";
import { ErrorsContext } from "../utils/errors";
import { UserContext, extractCreatorFromCreatedBy } from "../utils/user";
import { useQuery } from "@tanstack/react-query";
import { getArenaUserInfo } from "../utils/arena";
import { BlockCreatedByAvatar } from "./BlockCreatedByAvatar";

function useBlockMenuItems(
  block: Block,
  { onClickEdit }: { onClickEdit?: () => void } = {}
): {
  blockMenuItems: MenuItemProps[];
} {
  const { deleteBlock } = useContext(DatabaseContext);
  const router = useRouter();
  const { id, source, content, type, title } = block;

  const blockMenuItems = useMemo(
    () => [
      { text: title || `Block ${id}`, isTitle: true },
      ...(source
        ? [
            {
              text: "View Source",
              icon: () => (
                <Icon name={"external-link"} type={IconType.FontAwesomeIcon} />
              ),
              onPress: () => {
                WebBrowser.openBrowserAsync(source!);
              },
            },
          ]
        : []),
      {
        text: "Details",
        icon: () => <Icon name="expand" type={IconType.FontAwesomeIcon} />,
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
              icon: () => <Icon name="edit" type={IconType.FontAwesomeIcon} />,
              onPress: () => {
                onClickEdit();
              },
            },
          ]
        : []),
      {
        text: "Connect",
        icon: () => <Icon name="link" type={IconType.FontAwesome6Icon} />,
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
        onPress: () => {
          deleteBlock(id);
        },
      },
    ],
    [id, source, content, type, title, deleteBlock]
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
  editable,
}: {
  block: Block;
  hideMetadata?: boolean;
  hideHoldMenu?: boolean;
  shouldLink?: boolean;
  style?: object;
  blockStyle?: object;
  containerProps?: GetProps<typeof YStack>;
  editable?: boolean;
}) {
  const { id, title, createdAt } = block;
  const { updateBlock } = useContext(DatabaseContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { logError } = useContext(ErrorsContext);

  async function commitEdit(newContent: string | null) {
    try {
      if (newContent !== null) {
        await updateBlock({ blockId: id, editInfo: { content: newContent } });
      }
    } catch (err) {
      logError(err);
      // TODO: toast with error;
    } finally {
      setIsEditing(false);
    }
  }

  async function update(updateFn: () => ReturnType<typeof updateBlock>) {
    setIsLoading(true);
    try {
      await updateFn();
    } finally {
      setIsLoading(false);
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
        // @ts-ignore
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

    const date = remoteConnectedAt ? new Date(remoteConnectedAt) : createdAt;

    const dateDisplay = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    let metadata = [<Fragment key="date">{dateDisplay}</Fragment>];
    switch (type) {
      case BlockType.Link:
        metadata.push(
          <Fragment key={"link"}>
            from <ExternalLink href={source!}>{source}</ExternalLink>
          </Fragment>
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
      {editable && (
        <EditableTextOnClick
          inputProps={{
            title: true,
            enterKeyHint: "done",
            ellipse: true,
          }}
          text={title}
          defaultText="Add a title..."
          disabled={isLoading}
          onEdit={async (newTitle) => {
            await update(
              async () =>
                await updateBlock({
                  blockId: id,
                  editInfo: { title: newTitle },
                })
            );
          }}
        />
      )}
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
  blockStyle?: StyleProps;
  isRemoteCollection?: boolean;
  containerProps?: GetProps<typeof YStack>;
}) {
  // TODO: add connectedBy for getCollectionItems... maybe default this to createdBy or undefined for others
  const { id, type, source, title, description, connectedBy } = block;
  const theme = useTheme();
  const { updateBlock, deleteBlock } = useContext(DatabaseContext);
  const { isBlockConnectedByUser, isBlockCreatedByUser } =
    useContext(UserContext);
  const [isEditing, setIsEditing] = useState(false);
  const widthProperty = blockStyle?.width || 250;
  const isOwner = connectedBy
    ? isBlockConnectedByUser(block)
    : isBlockCreatedByUser(block);

  const { logError } = useContext(ErrorsContext);

  const showBackground =
    [BlockType.Text, BlockType.Link].includes(type) ||
    ([BlockType.Image].includes(type) && Boolean(title));

  async function commitEdit(newContent: string | null) {
    try {
      if (newContent !== null) {
        await updateBlock({ blockId: id, editInfo: { content: newContent } });
      }
    } catch (err) {
      logError(err);
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

  const renderContent = useCallback(() => {
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
          // @ts-ignore
          borderRadius: "$2",
          ...blockStyle,
        }}
        textContainerProps={{
          // borderWidth: 1,
          borderRadius: "$2",
          borderColor: theme.color?.get(),
          space: "$2",
          padding: "$2.5",
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
  }, [block]);

  const renderedMetadata = useMemo(() => {
    return (
      !hideMetadata && (
        <BlockMetadata
          block={block}
          textProps={{ textAlign: isOwner === false ? "left" : "right" }}
          isRemoteCollection={isRemoteCollection}
          dateKind="relative"
        />
      )
    );
  }, [hideMetadata, isRemoteCollection, block]);

  const renderedSummary = (
    <XStack
      gap="$1.5"
      {...containerProps}
      // maxWidth={isOwner === false ? "90%" : undefined}
      justifyContent={isOwner === false ? "flex-start" : "flex-end"}
      marginLeft={isOwner === false ? undefined : "auto"}
    >
      {isOwner === false && (
        <BlockCreatedByAvatar
          block={block}
          containerProps={{
            alignSelf: "flex-end",
            marginBottom: "$5",
          }}
        ></BlockCreatedByAvatar>
      )}
      <YStack gap="$1">
        <HoldItem items={blockMenuItems} closeOnTap>
          <StyledView
            backgroundColor={showBackground ? "$gray6" : undefined}
            borderRadius="$4"
            height="auto"
          >
            {renderContent()}
          </StyledView>
        </HoldItem>
        {renderedMetadata}
      </YStack>
    </XStack>
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
  blockStyle?: StyleProps;
  isRemoteCollection?: boolean;
  containerProps?: GetProps<typeof YStack>;
}) {
  const { id, type, source, title, description, createdBy, connectedBy } =
    block;
  const theme = useTheme();
  const widthProperty = blockStyle?.width || 250;
  const { isBlockCreatedByUser, isBlockConnectedByUser } =
    useContext(UserContext);
  const isOwner = connectedBy
    ? isBlockConnectedByUser(block)
    : isBlockCreatedByUser(block);
  const { userId } = extractCreatorFromCreatedBy(connectedBy || createdBy);

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
          // @ts-ignore
          borderRadius: "$2",
          ...blockStyle,
        }}
        textContainerProps={{
          // borderWidth: 1,
          borderRadius: "$2",
          borderColor: theme.color?.get(),
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
      <YStack gap="$2" {...containerProps}>
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
        {/* TODO: this should be who connected it */}
        {isOwner === false && (
          <XStack gap="$1.5" alignItems="center">
            <BlockCreatedByAvatar block={block} />
            <StyledText>{userId}</StyledText>
          </XStack>
        )}
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
  dateKind,
}: {
  block: Block;
  textProps?: TextProps;
  isRemoteCollection?: boolean;
  dateKind?: "relative" | "absolute";
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
      const date =
        isRemoteCollection && remoteConnectedAt
          ? new Date(remoteConnectedAt)
          : createdAt;
      const dateInfo =
        dateKind === "relative"
          ? getRelativeDate(date)
          : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      metadata = (
        <>
          {dateInfo}
          {"  "}
          {numConnections}{" "}
          <IconComponent
            name="link"
            type={IconType.FontAwesome6Icon}
            size={12}
            color="$gray9"
          />
        </>
      );
      break;
  }

  return (
    <StyledText metadata ellipse={true} textAlign="right" {...textProps}>
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
        <Fragment key={c}>
          <IconComponent
            name="link"
            type={IconType.FontAwesome6Icon}
            size={12}
            color="$gray9"
          />{" "}
          {c}
          {"  "}
        </Fragment>
      ))}
    </StyledText>
  );
}
