import { useContext } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { StyledView } from "./Themed";
import { Pressable, StyleSheet } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { Link } from "expo-router";

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);

  function renderBlock(block: Block) {
    return (
      <Link
        href={{
          pathname: "/block/[id]",
          params: { id: block.id },
        }}
        key={block.id}
        asChild
      >
        <Pressable>
          <BlockSummary block={block} />
        </Pressable>
      </Link>
    );
  }

  // TODO: use tabs to render blocks + collections
  return <StyledView style={styles.feed}>{blocks.map(renderBlock)}</StyledView>;
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
