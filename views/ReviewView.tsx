import { useQuery } from "@tanstack/react-query";
import { useContext, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import {
  Adapt,
  Select,
  Sheet,
  Spinner,
  XStack,
  YStack,
  useDebounce,
  useWindowDimensions,
} from "tamagui";
import { BlockReviewSummary, BlockSummary } from "../components/BlockSummary";
import { CollectionSelect } from "../components/CollectionSelect";
import {
  Icon,
  IconType,
  StyledButton,
  StyledLabel,
} from "../components/Themed";
import { afterAnimations } from "../utils/afterAnimations";
import { Block, SortType } from "../utils/dataTypes";
import { DatabaseContext } from "../utils/db";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

enum ViewType {
  Carousel = "carousel",
  Feed = "feed",
}

export function ReviewView() {
  const {
    getBlocks,
    getCollectionItems,
    selectedReviewCollection,
    setSelectedReviewCollection,
  } = useContext(DatabaseContext);

  const [view, setView] = useState<ViewType>(ViewType.Carousel);
  const [sortType, setSortType] = useState<SortType>(SortType.Random);
  function toggleView() {
    setView((prev) =>
      prev === ViewType.Carousel ? ViewType.Feed : ViewType.Carousel
    );
  }
  const queryKey = ["blocks", selectedReviewCollection, { sortType }] as const;
  const carouselRef = useRef<ICarouselInstance>(null);

  const generateSeed = () =>
    1 + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER - 1);
  const { data: tempBlocks, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const [_, collectionId] = queryKey;

      const blocks = !collectionId
        ? await getBlocks({ page: null, sortType, seed })
        : await getCollectionItems(collectionId, {
            page: null,
            sortType,
            seed,
          });

      return blocks;
    },
  });
  const [seed, setSeed] = useState(generateSeed());
  const randomizedBlocks = useMemo(
    () =>
      isLoading
        ? []
        : [...(tempBlocks || [])].sort(
            (a, b) =>
              Math.sin(Number(a.id) + seed) - Math.sin(Number(b.id) + seed)
          ),
    [tempBlocks, seed]
  );
  function randomizeBlocks() {
    setSeed(generateSeed());
  }
  const outputBlocks = useMemo(
    () => (sortType === SortType.Random ? randomizedBlocks : tempBlocks),
    [sortType, randomizedBlocks, tempBlocks]
  );

  // TODO: use this when native sqlite random sort works
  // const [seed, setSeed] = useState(generateSeed());
  // const queryClient = useQueryClient();
  // const { data, error, isFetchingNextPage, fetchNextPage, hasNextPage } =
  //   useInfiniteQuery({
  //     queryKey,
  //     queryFn: async ({ pageParam, queryKey }) => {
  //       const [_, collectionId] = queryKey;

  //       const blocks = !collectionId
  //         ? await getBlocks({ page: pageParam, sortType, seed })
  //         : await getCollectionItems(collectionId, {
  //             page: pageParam,
  //             sortType,
  //             seed,
  //           });

  //       return {
  //         blocks,
  //         nextId: pageParam + 1,
  //         previousId: pageParam === 0 ? undefined : pageParam - 1,
  //       };
  //     },
  //     initialPageParam: 0,
  //     getPreviousPageParam: (firstPage) => firstPage.previousId ?? undefined,
  //     getNextPageParam: (lastPage) => lastPage.nextId ?? undefined,
  //   });
  // const outputBlocks = data?.pages.flatMap((p) => p.blocks);
  // function randomizeBlocks() {
  //   setSeed(generateSeed());
  //   queryClient.invalidateQueries({
  //     queryKey: ["blocks", selectedReviewCollection, { sortType }],
  //   });
  // }
  // function fetchMoreBlocks() {
  //   if (!hasNextPage) {
  //     return;
  //   }
  //   fetchNextPage();
  // }

  return (
    <YStack gap="$2" flex={1}>
      <XStack marginTop="$2" width="100%" zIndex={1} paddingHorizontal="$2">
        <XStack alignItems="center" width="100%" justifyContent="space-between">
          <XStack
            paddingHorizontal="$3"
            borderTopLeftRadius={100}
            borderBottomLeftRadius={100}
            borderTopRightRadius="$1"
            borderBottomRightRadius="$1"
            paddingRight={0}
            backgroundColor="$background"
            elevation="$3"
            overflow="hidden"
            // borderWidth={0.5}
            // borderColor="$gray7"
          >
            <StyledLabel>Reviewing </StyledLabel>
            <YStack marginLeft="$1">
              <CollectionSelect
                onTriggerSelect={() => {
                  Keyboard.dismiss();
                  carouselRef.current?.scrollTo({ index: 0 });
                }}
                hideChevron
                selectedCollection={selectedReviewCollection}
                setSelectedCollection={setSelectedReviewCollection}
                collectionPlaceholder="All collections"
                triggerProps={{
                  backgroundColor: "$orange6",
                  padding: "$2",
                  borderRadius: "$1",
                  maxWidth: 190,
                }}
              />
            </YStack>
          </XStack>
          <XStack gap="$1">
            {/* square */}
            {/* <SortSelect /> */}
            <StyledButton
              size="$small"
              onPress={() => {
                if (sortType === SortType.Created) {
                  randomizeBlocks();
                }
                setSortType((prev) =>
                  prev === SortType.Random ? SortType.Created : SortType.Random
                );
                carouselRef.current?.scrollTo({ index: 0 });
              }}
              icon={
                sortType === SortType.Created ? (
                  <Icon name="random" type={IconType.FontAwesomeIcon} />
                ) : (
                  <Icon name="sort" type={IconType.FontAwesomeIcon} />
                )
              }
              borderRadius={100}
            ></StyledButton>
            <StyledButton
              size="$small"
              icon={
                <Icon name={view === ViewType.Carousel ? "grid" : "image"} />
              }
              backgroundColor="$gray6"
              onPress={toggleView}
            ></StyledButton>
          </XStack>
        </XStack>
      </XStack>
      {/* @ts-ignore */}
      {afterAnimations(ReviewItems)({
        view,
        outputBlocks,
        fetchMoreBlocks: () => {},
        isFetchingNextPage: false,
        carouselRef,
      })}
    </YStack>
  );
}

function ReviewItems({
  view,
  outputBlocks,
  fetchMoreBlocks,
  isFetchingNextPage,
  carouselRef,
}: {
  view: ViewType;
  outputBlocks: Block[] | null;
  fetchMoreBlocks: () => void;
  isFetchingNextPage: boolean;
  carouselRef: React.MutableRefObject<ICarouselInstance | null>;
}) {
  if (!outputBlocks)
    return (
      <YStack height="100%" justifyContent="center">
        <Spinner size="large" color="$orange9" />
      </YStack>
    );

  switch (view) {
    case ViewType.Carousel:
      // TODO: handle fetching more blocks when using infiniteQuery
      return (
        <CarouselView outputBlocks={outputBlocks} carouselRef={carouselRef} />
      );
    case ViewType.Feed:
      return (
        <YStack marginTop="$10" flex={1}>
          <FeedView
            blocks={outputBlocks}
            fetchMoreBlocks={fetchMoreBlocks}
            isFetchingNextPage={isFetchingNextPage}
          />
        </YStack>
      );
  }
}

export function CarouselView({
  outputBlocks,
  carouselRef,
}: {
  outputBlocks: Block[];
  carouselRef: React.MutableRefObject<ICarouselInstance | null>;
}) {
  // Gestures
  // swipe down at very top to shuffle
  //   const nativeGesture = Gesture.Native();
  //   const scrollPanGesture = Gesture.Pan();
  //   const composedGestures = Gesture.Simultaneous(
  //     scrollPanGesture,
  //     nativeGesture
  //   );
  // 44 is the height of the top bar
  const bottomTabHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const height =
    useWindowDimensions().height - 44 - bottomTabHeight - insets.top;

  return (
    <YStack flex={1} paddingHorizontal="$4" width="100%" minHeight={height}>
      <Carousel
        ref={carouselRef}
        loop={false}
        vertical
        height={height}
        data={outputBlocks}
        // TODO: this isn't actually available in this source in this version but seemingly does something? i literally have no idea why
        // @ts-ignore
        minScrollDistancePerSwipe={0.1}
        windowSize={5}
        snapEnabled
        renderItem={({ item, index }) => (
          <YStack flex={1} flexGrow={1} alignItems="center">
            <BlockReviewSummary
              shouldLink
              block={item}
              style={{
                width: "100%",
                maxHeight: height * 0.9,
              }}
              blockStyle={{
                width: "100%",
                maxHeight: height * 0.8,
                resizeMode: "contain",
                aspectRatio: undefined,
                flexShrink: 1,
              }}
              containerProps={{
                width: "100%",
                minWidth: "100%",
                height: height,
                marginVertical: "auto",
                justifyContent: "center",
              }}
            />
          </YStack>
        )}
      />
    </YStack>
  );
}

export function FeedView({
  blocks,
  fetchMoreBlocks,
  isFetchingNextPage,
}: {
  blocks: Block[];
  fetchMoreBlocks: () => void;
  isFetchingNextPage: boolean;
}) {
  const debouncedFetchMoreBlocks = useDebounce(fetchMoreBlocks, 300);

  function renderBlock(block: Block) {
    return (
      <BlockSummary
        block={block}
        containerProps={{
          margin: "$3",
          width: 170,
          height: 170,
        }}
        blockStyle={{
          objectFit: "contain",
        }}
        style={{
          width: 170,
          height: "100%",
        }}
        shouldLink
      />
    );
  }

  // TODO: use tabs to render blocks + collections
  return (
    <YStack gap="$4" paddingHorizontal="$2" flex={1}>
      <FlatList
        numColumns={2}
        renderItem={({ item }) => renderBlock(item)}
        data={blocks}
        contentContainerStyle={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingBottom: 36,
        }}
        onEndReachedThreshold={0.3}
        onEndReached={debouncedFetchMoreBlocks}
        ListFooterComponent={
          isFetchingNextPage ? (
            <YStack
              justifyContent="center"
              alignSelf="center"
              alignItems="center"
              width="100%"
            >
              <Spinner size="small" color="$orange9" />
            </YStack>
          ) : null
        }
      ></FlatList>
    </YStack>
  );
}

function SortSelect() {
  return (
    <Select defaultValue="creation" native>
      <Select.Trigger maxWidth="$6" padding="$1" justifyContent="center">
        <Select.Value placeholder="Sort..." />
      </Select.Trigger>
      <Adapt platform="touch">
        {/* or <Select.Sheet> */}

        <Sheet dismissOnOverlayPress>
          <Sheet.Frame>
            <Adapt.Contents />
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>
      <Select.Content>
        <Select.Viewport>
          <Select.Group>
            <Select.Item value="creation" index={0}>
              <Select.ItemText>Chronological</Select.ItemText>
            </Select.Item>
            <Select.Item value="random" index={1}>
              <Select.ItemText>Random</Select.ItemText>
            </Select.Item>
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  );
}
