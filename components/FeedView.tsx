import { useContext } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { View } from "./Themed";
import { StyleSheet } from "react-native";
import { BlockSummary } from "./BlockSummary";

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);

  function renderBlock(block: Block) {
    return <BlockSummary block={block} key={block.id} />;
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
});
