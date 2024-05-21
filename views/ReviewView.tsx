import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  const outputBlocks = useMemo(
    () =>
      isLoading
        ? []
        : (tempBlocks || []).sort(
            (a, b) =>
              Math.sin(Number(a.id) + seed) - Math.sin(Number(b.id) + seed)
          ),
    [tempBlocks, seed]
  );
  function randomizeBlocks() {
    setSeed(generateSeed());
  }

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
      <XStack
        marginTop="$2"
        position="absolute"
        width="100%"
        zIndex={1}
        paddingHorizontal="$2"
      >
        <XStack alignItems="center" width="100%" justifyContent="space-between">
          <XStack
            paddingHorizontal="$3"
            borderTopLeftRadius={100}
            borderBottomLeftRadius={100}
            borderTopRightRadius="$1"
            borderBottomRightRadius="$1"
            paddingRight={0}
            backgroundColor="$background"
            elevation="$4"
            overflow="hidden"
            // borderWidth={0.5}
            // borderColor="$gray7"
          >
            <StyledLabel>Reviewing </StyledLabel>
            <YStack marginLeft="$1">
              <CollectionSelect
                onTriggerSelect={() => {
                  Keyboard.dismiss();
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
            {/* <SortSelect/> */}
            <StyledButton
              size="$small"
              onPress={randomizeBlocks}
              icon={<Icon name="random" type={IconType.FontAwesomeIcon} />}
              borderRadius={100}
            ></StyledButton>
            <StyledButton
              size="$small"
              icon={
                <Icon name={view === ViewType.Carousel ? "grid" : "square"} />
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
      })}
    </YStack>
  );
}

function ReviewItems({
  view,
  outputBlocks,
  fetchMoreBlocks,
  isFetchingNextPage,
}: {
  view: ViewType;
  outputBlocks: Block[] | null;
  fetchMoreBlocks: () => void;
  isFetchingNextPage: boolean;
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
      return <CarouselView outputBlocks={outputBlocks} />;
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

export function CarouselView({ outputBlocks }: { outputBlocks: Block[] }) {
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

  return (
    <YStack flex={1} paddingHorizontal="$4" width="100%">
      <Carousel
        ref={carouselRef}
        loop={false}
        vertical
        height={height}
        data={outputBlocks}
        windowSize={5}
        minScrollDistancePerSwipe={5}
        scrollAnimationDuration={20}
        snapEnabled
        renderItem={({ item, index }) => (
          <YStack
            alignItems="center"
            justifyContent="center"
            flex={1}
            flexGrow={1}
            marginBottom="40%"
            width="100%"
            height="100%"
          >
            <BlockReviewSummary
              shouldLink
              block={item}
              // TODO: not scrolling properly
              style={{
                width: "100%",
                maxHeight: height / 2,
              }}
              blockStyle={{
                width: "100%",
                borderRadius: 8,
                maxHeight: height / 2,
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
          resizeMode: "contain",
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
    <Select defaultValue="one" native>
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
              <Select.ItemText>creation</Select.ItemText>
            </Select.Item>
            <Select.Item value="random" index={1}>
              <Select.ItemText>random</Select.ItemText>
            </Select.Item>
            <Select.Item value="hlelo" index={2}>
              <Select.ItemText>hlelo</Select.ItemText>
            </Select.Item>
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  );
}
