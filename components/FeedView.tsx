import { useContext } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { View, Text } from "./Themed";
import { StyleSheet, Image } from "react-native";
import { isImageType } from "../utils/mimeTypes";

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);

  function renderBlock({ id, content, type }: Block) {
    return (
      <View key={id} style={styles.block}>
        {isImageType(type) ? (
          <Image source={{ uri: content }} style={styles.contentImg} />
        ) : (
          <Text style={styles.contentText}>{content}</Text>
        )}
      </View>
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
