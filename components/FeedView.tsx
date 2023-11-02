import { useContext, useMemo, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { SearchBarInput, StyledText, StyledView } from "./Themed";
import { FlatList, Pressable, StyleSheet } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { Link } from "expo-router";
import { YStack } from "tamagui";

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);

  const sortedBlocks = useMemo(
    () =>
      [...blocks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [blocks]
  );

  function renderBlock(block: Block) {
    return (
      <Link
        href={{
          pathname: "/block/[id]/",
          params: { id: block.id },
        }}
        key={block.id}
        asChild
      >
        <Pressable>
          <YStack alignItems="center" justifyContent="center" width="100%">
            <BlockSummary
              block={block}
              blockStyle={{
                // maxWidth: 150,
                maxHeight: 150,
              }}
              style={{
                maxHeight: 180,
              }}
            />
          </YStack>
        </Pressable>
      </Link>
    );
  }

  const [searchValue, setSearchValue] = useState("");

  const filteredBlocks = sortedBlocks.filter((block) =>
    // TODO: handle date search
    [block.title, block.content, block.source, block.description]
      .filter((b) => Boolean(b))
      .join("\n")
      .toLocaleLowerCase()
      .includes(searchValue.toLocaleLowerCase())
  );

  // TODO: use tabs to render blocks + collections
  return (
    <>
      <YStack space="$4" paddingHorizontal="$2" flexGrow={1}>
        <SearchBarInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
        <StyledText textAlign="center">Recent Blocks</StyledText>
        {/* <FlatList
          renderItem={({ item }) => renderBlock(item)}
          data={filteredBlocks}
          contentContainerStyle={styles.feed}
        ></FlatList> */}
        <StyledView style={styles.feed}>
          {filteredBlocks.map(renderBlock)}
        </StyledView>
      </YStack>
    </>
  );
}

const styles = StyleSheet.create({
  feed: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    // remove with flatlist
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
