import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Block } from "../utils/dataTypes";
import { BlockReviewSummary, BlockSummary } from "../components/BlockSummary";
import { Spinner, XStack, YStack, useWindowDimensions } from "tamagui";
import { FlatList } from "react-native";
import { Icon, StyledButton, StyledLabel } from "../components/Themed";
import { CollectionSelect } from "../components/CollectionSelect";
import { Keyboard } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { CollectionToReviewKey, useStickyValue } from "../utils/asyncStorage";

const RenderChunkSize = 25;

enum ViewType {
  Carousel = "carousel",
  Feed = "feed",
}

export function ReviewView() {
  const { blocks } = useContext(DatabaseContext);
  const [randomBlocks, setRandomBlocks] = useState<Block[]>([]);
  const [selectedCollection, setSelectedCollection] = useStickyValue<
    string | null
  >(CollectionToReviewKey, null);
  const [view, setView] = useState<ViewType>(ViewType.Carousel);
  function toggleView() {
    setView((prev) =>
      prev === ViewType.Carousel ? ViewType.Feed : ViewType.Carousel
    );
  }

  useEffect(() => {
    randomizeBlocks();
    // have some logic of storing what has been reviewed..
  }, []);

  function randomizeBlocks() {
    const randomized = [...blocks].sort(() => Math.random() - 0.5);
    setRandomBlocks(randomized);
  }

  const filteredBlocks = useMemo(() => {
    return randomBlocks.filter(
      (block) =>
        selectedCollection === null ||
        block.collectionIds?.includes(selectedCollection)
    );
  }, [selectedCollection, randomBlocks]);

  // Gestures
  // swipe down at very top to shuffle
  //   const nativeGesture = Gesture.Native();
  //   const scrollPanGesture = Gesture.Pan();
  //   const composedGestures = Gesture.Simultaneous(
  //     scrollPanGesture,
  //     nativeGesture
  //   );
  const height = useWindowDimensions().height;
  const carouselRef = useRef<ICarouselInstance>(null);

  function renderView() {
    switch (view) {
      case ViewType.Carousel:
        return (
          <YStack flex={1} paddingHorizontal="$4">
            <Carousel
              ref={carouselRef}
              loop={false}
              vertical
              height={height}
              data={filteredBlocks}
              windowSize={5}
              renderItem={({ item, index }) => (
                <YStack
                  alignItems="center"
                  justifyContent="center"
                  flex={1}
                  flexGrow={1}
                  marginBottom="50%"
                  width="100%"
                >
                  <BlockReviewSummary
                    shouldLink
                    block={item}
                    style={{
                      width: "100%",
                    }}
                    blockStyle={{
                      width: "100%",
                      maxHeight: 400,
                      borderRadius: 8,
                    }}
                    containerProps={{
                      width: "100%",
                      minWidth: "100%",
                    }}
                  />
                </YStack>
              )}
            />
          </YStack>
        );
      case ViewType.Feed:
        return (
          <YStack marginTop="$10" flex={1}>
            <FeedView blocks={filteredBlocks} />
          </YStack>
        );
    }
  }

  return !filteredBlocks.length ? (
    <YStack height="100%" justifyContent="center">
      <Spinner size="large" />
    </YStack>
  ) : (
    <YStack gap="$2" flex={1}>
      <XStack
        marginTop="$2"
        position="absolute"
        width="100%"
        zIndex={1}
        paddingHorizontal="$1.5"
      >
        <XStack alignItems="center" width="100%" justifyContent="space-between">
          <XStack
            paddingHorizontal="$3"
            borderTopLeftRadius={100}
            borderBottomLeftRadius={100}
            borderTopRightRadius="$1"
            borderBottomRightRadius="$1"
            paddingRight={0}
            backgroundColor="$gray2"
            elevation="$4"
            maxWidth="60%"
            overflow="hidden"
            borderWidth={0.25}
            borderColor="$gray8"
          >
            <StyledLabel>Reviewing </StyledLabel>
            <YStack marginLeft="$1">
              <CollectionSelect
                onTriggerSelect={() => {
                  Keyboard.dismiss();
                }}
                hideChevron
                selectedCollection={selectedCollection}
                setSelectedCollection={setSelectedCollection}
                collectionPlaceholder="All collections"
                triggerProps={{
                  backgroundColor: "$gray6",
                  padding: "$2",
                  borderRadius: "$1",
                }}
              />
            </YStack>
          </XStack>
          <XStack gap="$2">
            {/* square */}
            <StyledButton
              size="$small"
              onPress={randomizeBlocks}
              icon={<Icon name="random" />}
              borderRadius={100}
            ></StyledButton>
            <StyledButton
              size="$small"
              icon={
                <Icon
                  name={view === ViewType.Carousel ? "th-large" : "square"}
                />
              }
              theme="gray"
              onPress={toggleView}
            ></StyledButton>
          </XStack>
        </XStack>
      </XStack>
      {renderView()}
    </YStack>
  );
}

export function FeedView({ blocks }: { blocks: Block[] }) {
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
    <YStack gap="$4" paddingHorizontal="$2" flex={1}>
      <FlatList
        numColumns={2}
        renderItem={({ item }) => renderBlock(item)}
        data={blocksToRender}
        contentContainerStyle={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingBottom: 36,
        }}
        onEndReachedThreshold={0.3}
        onEndReached={fetchMoreBlocks}
      ></FlatList>
    </YStack>
  );
}
