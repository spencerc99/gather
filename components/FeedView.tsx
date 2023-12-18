import { useContext, useMemo, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import { SearchBarInput } from "./Themed";
import { FlatList, StyleSheet } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { YStack, useDebounceValue } from "tamagui";
import { filterItemsBySearchValue } from "../utils/search";
import Animated, {
  Easing,
  SlideInDown,
  SlideInLeft,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutUp,
} from "react-native-reanimated";

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);

  function renderBlock(block: Block) {
    return (
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
          shouldLink
        />
      </YStack>
    );
  }

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);

  const filteredBlocks = useMemo(
    () =>
      filterItemsBySearchValue(blocks, debouncedSearch, [
        "title",
        "content",
        "source",
        "description",
      ]),
    [blocks, debouncedSearch]
  );
  const outputBlocks = useMemo(
    () =>
      [...filteredBlocks].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [filteredBlocks]
  );

  // TODO: use tabs to render blocks + collections
  return (
    <Animated.View
      entering={SlideInLeft.duration(500).easing(Easing.ease)}
      exiting={SlideOutLeft.duration(750).easing(Easing.ease)}
    >
      <YStack space="$4" paddingHorizontal="$2" flexGrow={1}>
        <SearchBarInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
        {/* <StyledText textAlign="center">Recent Blocks</StyledText> */}
        <FlatList
          renderItem={({ item }) => renderBlock(item)}
          data={outputBlocks}
          contentContainerStyle={styles.feed}
        ></FlatList>
        {/* <StyledView style={styles.feed}>
          {outputBlocks.map(renderBlock)}
        </StyledView> */}
      </YStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  feed: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    // remove with flatlist
    // flexDirection: "row",
    // flexWrap: "wrap",
  },
});
