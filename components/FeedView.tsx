import { useContext } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { View, Text } from "./Themed";
import { StyleSheet, Image } from "react-native";
import { isImageType } from "../utils/mimeTypes";
import { HoldItem } from "react-native-hold-menu";
import { FontAwesome } from "@expo/vector-icons";

export function FeedView() {
  const { blocks, deleteBlock } = useContext(DatabaseContext);

  function renderBlock({ id, content, type, source }: Block) {
    const blockMenuItems = [
      { text: "Actions", isTitle: true, onPress: () => {} },
      ...(source
        ? [
            {
              text: "View Source",
              icon: () => <FontAwesome name={"external-link"} size={18} />,
              onPress: () => console.log("View Source"),
            },
          ]
        : []),
      {
        text: "Share",
        icon: () => <FontAwesome name="share" size={18} />,
        onPress: () => {},
      },
      {
        text: "Connect",
        icon: () => <FontAwesome name="link" size={18} />,
        onPress: () => {},
      },
      {
        text: "Delete",
        icon: () => <FontAwesome name={"trash"} size={18} />,
        isDestructive: true,
        // TODO: add confirmation dialog
        onPress: () => deleteBlock(id),
      },
    ];

    return (
      // TODO: HoldItem library is broken with expo 49 rn... https://github.com/enesozturk/react-native-hold-menu/issues/111
      <HoldItem items={blockMenuItems} key={id} closeOnTap>
        <View style={styles.block} key={id}>
          {isImageType(type) ? (
            <Image source={{ uri: content }} style={styles.contentImg} />
          ) : (
            <Text style={styles.contentText}>{content}</Text>
          )}
        </View>
      </HoldItem>
    );
  }
  return <View style={styles.feed}>{blocks.map(renderBlock)}</View>;
}

const styles = StyleSheet.create({
  feed: {
    marginTop: 32,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
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
  contentText: {},
  contentImg: {
    // this is so dumb, only needed because react native for some reason default renders a wrapper div and then the image tag..
    width: "100%",
    height: "100%",
  },
});
