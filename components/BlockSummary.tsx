import { Block, DatabaseContext } from "../utils/db";
import { StyleSheet } from "react-native";
import { MimeType } from "../utils/mimeTypes";
import { HoldItem } from "react-native-hold-menu";
import { FontAwesome } from "@expo/vector-icons";
import { MediaView } from "./MediaView";
import { useContext } from "react";
import { Text, View } from "./Themed";

export function BlockSummary({ block }: { block: Block }) {
  const { id, content, type, source } = block;
  const { deleteBlock } = useContext(DatabaseContext);

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

  function renderContent() {
    switch (type) {
      case MimeType[".txt"]:
        return <Text style={styles.contentText}>{content}</Text>;
      default:
        return (
          <MediaView
            media={content}
            mimeType={type}
            style={styles.contentImg}
          />
        );
    }
  }

  return (
    <HoldItem items={blockMenuItems} key={id} closeOnTap>
      <View style={styles.block} key={id}>
        {renderContent()}
      </View>
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
  contentText: {},
  contentImg: {
    // this is so dumb, only needed because react native for some reason default renders a wrapper div and then the image tag..
    width: "100%",
    height: "100%",
  },
});
