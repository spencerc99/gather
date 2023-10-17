import { Block, DatabaseContext } from "../utils/db";
import { StyleSheet } from "react-native";
import { HoldItem } from "react-native-hold-menu";
import { useContext } from "react";
import { Icon, StyledText, StyledView } from "./Themed";
import { BlockContent } from "./BlockContent";
import { YStack, useTheme } from "tamagui";
import { getRelativeDate } from "../utils/date";
import { useRouter } from "expo-router";

export function BlockSummary({
  block,
  hideMetadata,
  style,
}: {
  block: Pick<
    Block,
    "id" | "title" | "content" | "type" | "source" | "createdAt"
  >;
  hideMetadata?: boolean;
  style?: object;
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
    return (
      <BlockContent
        content={content}
        type={type}
        style={{
          maxWidth: 150,
          maxHeight: 150,
          aspectRatio: 1,
        }}
      />
    );
  }

  const theme = useTheme();

  return (
    <YStack space="$1" alignItems="center" key={id}>
      <HoldItem items={blockMenuItems} closeOnTap>
        <StyledView
          style={[styles.block, style]}
          key={id}
          borderColor={theme.color.get()}
          backgroundColor={theme.background.get()}
        >
          {renderContent()}
        </StyledView>
      </HoldItem>
      {!hideMetadata && (
        <StyledText metadata ellipse={true}>
          {title ? `${title}` : `${getRelativeDate(createdAt)}`}
        </StyledText>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  block: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    width: 150,
    height: 150,
    padding: 12,
  },
});

export function BlockTextSummary({
  block,
  hideMetadata,
  style,
}: {
  block: Pick<
    Block,
    "id" | "title" | "content" | "type" | "source" | "createdAt"
  >;
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
    return (
      <BlockContent
        key={id}
        content={content}
        type={type}
        style={{
          maxWidth: 250,
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
  }

  return (
    <YStack space="$1">
      <HoldItem items={blockMenuItems} closeOnTap>
        {renderContent()}
      </HoldItem>
      {!hideMetadata && (
        <StyledText metadata ellipse={true} textAlign="right">
          {getRelativeDate(createdAt)}
        </StyledText>
      )}
    </YStack>
  );
}
