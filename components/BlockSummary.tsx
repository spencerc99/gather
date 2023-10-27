import { Block, DatabaseContext } from "../utils/db";
import * as WebBrowser from "expo-web-browser";
import { MimeType } from "../utils/mimeTypes";
import { Platform, StyleSheet } from "react-native";
import { HoldItem } from "react-native-hold-menu";
import { useContext } from "react";
import { Icon, StyledText, StyledView } from "./Themed";
import { BlockContent } from "./BlockContent";
import { TextProps, YStack, useTheme, styled } from "tamagui";
import { getRelativeDate } from "../utils/date";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { ExternalLink } from "./ExternalLink";

export function BlockSummary({
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
  const { id, content, type, source, title, createdAt } = block;
  const { deleteBlock } = useContext(DatabaseContext);
  const router = useRouter();

  const blockMenuItems = [
    { text: "Actions", isTitle: true },
    ...(source
      ? [
          {
            text: "View Source",
            icon: () => <Icon name={"external-link"} />,
            onPress: () => {
              if (Platform.OS === "web") {
                Linking.openURL(source);
              } else {
                WebBrowser.openBrowserAsync(source);
              }
            },
          },
        ]
      : []),
    // {
    //   text: "Share",
    //   icon: () => <Icon name="share" />,
    //   onPress: () => {
    //     // TODO: copy deep link to clipboard
    //   },
    // },
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
  ];

  const theme = useTheme();

  return (
    <YStack space="$1" alignItems="center" key={id}>
      <HoldItem items={blockMenuItems} closeOnTap>
        <BlockContent
          {...block}
          containerStyle={style}
          mediaStyle={{
            aspectRatio: 1,
            ...blockStyle,
          }}
        />
      </HoldItem>
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
}: {
  block: Block;
  hideMetadata?: boolean;
  style?: object;
}) {
  const { deleteBlock } = useContext(DatabaseContext);
  const { id, content, type, source, title, createdAt } = block;
  const theme = useTheme();
  const router = useRouter();

  const blockMenuItems = [
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
    // {
    //   text: "Share",
    //   icon: () => <Icon name="share" />,
    //   onPress: () => {
    //     // TODO: copy deep link to clipboard
    //   },
    // },
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
  ];

  function renderContent() {
    const content = (
      <BlockContent
        key={id}
        {...block}
        mediaStyle={{
          width: 250,
          borderRadius: 4,
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
      case MimeType["link"]:
        return (
          <ExternalLink href={source!}>
            <YStack>
              {content}
              <YStack alignItems="flex-end" paddingBottom="$1" maxWidth={250}>
                <StyledText ellipse={true}>{title}</StyledText>
                <StyledText metadata ellipse={true}>
                  {source}
                </StyledText>
              </YStack>
            </YStack>
          </ExternalLink>
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
  const { type, createdAt, source } = block;

  let metadata;
  switch (type) {
    // case MimeType["link"]:
    //   metadata = (
    //     <>
    //       from <ExternalLink href={source!}>{source}</ExternalLink>
    //     </>
    //   );
    //   break;
    default:
      metadata = getRelativeDate(createdAt);
      break;
  }

  return (
    <StyledText metadata ellipse={true} textAlign="right">
      {metadata}
    </StyledText>
  );
}
