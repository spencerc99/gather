import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import { BlockSummary, BlockTextSummary } from "../components/BlockSummary";
import { Spinner, XStack, YStack } from "tamagui";
import { FlatList } from "react-native";
import { Icon, StyledButton, StyledLabel } from "../components/Themed";
import { CollectionSelect } from "../components/CollectionSelect";
import { Keyboard } from "react-native";

const RenderChunkSize = 25;

export function ReviewView() {
  return <RevisitView />;
}

function RevisitView() {
  const { blocks } = useContext(DatabaseContext);
  const [randomBlocks, setRandomBlocks] = useState<Block[]>([]);
  const [idx, setIdx] = useState(0);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );

  useEffect(() => {
    randomizeBlocks();
    // have some logic of storing what has been reviewed..
  }, []);

  function randomizeBlocks() {
    const randomized = [...blocks].sort(() => Math.random() - 0.5);
    setRandomBlocks(randomized);
  }

  const filteredBlocks = useMemo(
    () =>
      randomBlocks.filter(
        (block) =>
          !selectedCollection ||
          block.collectionIds?.includes(selectedCollection)
      ),
    [selectedCollection, randomBlocks]
  );

  return !filteredBlocks.length ? (
    <Spinner size="large" />
  ) : (
    <YStack gap="$2" flex={1}>
      <XStack
        marginTop="$2"
        justifyContent="center"
        position="absolute"
        width="100%"
        zIndex={1}
      >
        <XStack
          paddingHorizontal="$5"
          paddingVertical="$2"
          backgroundColor="$gray1"
          elevation="$4"
          borderRadius={100}
          gap="$1.5"
          alignItems="center"
        >
          <StyledLabel>Showing </StyledLabel>
          <YStack maxWidth={200}>
            <CollectionSelect
              onTriggerSelect={() => {
                Keyboard.dismiss();
              }}
              hideChevron
              selectedCollection={selectedCollection}
              setSelectedCollection={setSelectedCollection}
              collectionPlaceholder="All collections"
              triggerProps={{
                theme: "orange",
                backgroundColor: "$orange4",
                padding: "$2",
              }}
            />
          </YStack>
          <StyledButton
            size="$small"
            onPress={randomizeBlocks}
            icon={<Icon name="random" />}
          ></StyledButton>
        </XStack>
      </XStack>
      <YStack
        flexGrow={1}
        flex={1}
        alignItems="center"
        justifyContent="center"
        marginHorizontal="$2"
      >
        <BlockTextSummary
          shouldLink
          block={filteredBlocks[idx]}
          style={{
            width: "100%",
          }}
          blockStyle={{
            width: "100%",
            maxHeight: 400,
            borderRadius: 8,
          }}
        />
      </YStack>
    </YStack>
  );
}

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);
  function renderBlock(block: Block) {
    return (
      <BlockSummary
        block={block}
        containerProps={{
          margin: "$3",
          width: 170,
          height: 170,
        }}
        style={{
          width: 170,
          height: "100%",
        }}
        shouldLink
      />
    );
  }

  const outputBlocks = useMemo(
    () =>
      [...blocks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [blocks]
  );

  const [pages, setPages] = useState(1);

  const blocksToRender = useMemo(
    () => outputBlocks.slice(0, pages * RenderChunkSize),
    [outputBlocks, pages]
  );

  function fetchMoreBlocks() {
    setPages(pages + 1);
  }

  // TODO: use tabs to render blocks + collections
  return (
    <YStack gap="$4" paddingHorizontal="$2" flexGrow={1}>
      <FlatList
        numColumns={2}
        renderItem={({ item }) => renderBlock(item)}
        data={blocksToRender}
        contentContainerStyle={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
        onEndReachedThreshold={0.3}
        onEndReached={fetchMoreBlocks}
      ></FlatList>
    </YStack>
  );
}
