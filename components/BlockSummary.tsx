import { Block, DatabaseContext } from "../utils/db";
import { StyleSheet } from "react-native";
import { HoldItem } from "react-native-hold-menu";
import { useContext } from "react";
import { Icon, StyledText, StyledView } from "./Themed";
import { BlockContent } from "./BlockContent";
import { useTheme } from "tamagui";

export function BlockSummary({
  block,
  style,
}: {
  block: Block;
  style?: object;
}) {
  const { id, content, type, source } = block;
  const { deleteBlock } = useContext(DatabaseContext);

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
    {
      text: "Share",
      icon: () => <Icon name="share" />,
      onPress: () => {
        // TODO: copy deep link to clipboard
      },
    },
    {
      text: "Connect",
      icon: () => <Icon name="link" />,
      onPress: () => {
        // TODO: bring up the connections modal
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
    return <BlockContent content={content} type={type} />;
  }

  const theme = useTheme();

  return (
    <HoldItem items={blockMenuItems} key={id} closeOnTap>
      <StyledView
        style={[styles.block, style]}
        key={id}
        borderColor={theme.color.get()}
      >
        {renderContent()}
      </StyledView>
    </HoldItem>
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
