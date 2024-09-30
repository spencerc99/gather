import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DatabaseContext } from "../utils/db";
import { Block, Collection, CollectionBlock } from "../utils/dataTypes";
import { Spinner, XStack, YStack, useDebounce } from "tamagui";
import { Icon, IconType, StyledButton, StyledText } from "./Themed";
import { BlockTextSummary } from "./BlockSummary";
import { Swipeable } from "react-native-gesture-handler";
import { router } from "expo-router";
import {
  Dimensions,
  FlatList,
  Keyboard,
  ScrollView,
  ViewToken,
} from "react-native";
import { BlockContent } from "./BlockContent";
import { BlockType } from "../utils/mimeTypes";
import Carousel from "react-native-reanimated-carousel";
import { RawAnimations } from "../animations";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { gestureHandlerRootHOC } from "react-native-gesture-handler";

export const InspoBlocks = [
  {
    content:
      "https://d2w9rnfcy7mm78.cloudfront.net/25197739/original_606f6067eb04a9d337c570f8740bfa21.png?1702426508?bc=0",
    type: BlockType.Image,
  },
  {
    content:
      "Have nothing in your h̶o̶m̶e̶ phone that you do not know to be useful or believe to be beautiful — Charles Eames",
    type: BlockType.Text,
  },
  {
    content:
      "https://d2w9rnfcy7mm78.cloudfront.net/20590577/original_e33ff62cc7fdb21977c885d31fec49a4.png?1677457177?bc=0",
    type: BlockType.Image,
  },
  {
    content: `Do not be tricked into believing that modern decor must be slick or psychedelic, or "natural" or "modern art," or "plants" or anything else that current taste-makers claim. It is most beautiful when it comes straight from your life—the things you care for, the things that tell your story.`,
    type: BlockType.Text,
  },
  {
    // synonym
    content:
      "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIyNDE5MDc1OS9vcmlnaW5hbF9jMzc4ZGZjZWQ0M2QyM2QxZmIwZWM2Y2YyZWUwNWZiNy5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJwbmciOnsicXVhbGl0eSI6NzV9LCJyb3RhdGUiOm51bGx9fQ==",
    type: BlockType.Image,
  },
  {
    content: `If it is a human thing to do to put something you want, because it's useful, edible, or beautiful, into a bag, or a basket, or a bit of rolled bark or leaf, or a net woven of your own hair, or what have you, and then take it home with you...—if to do that is human, if that's what it takes, then I am a human being after all. Fully, freely, gladly, for the first time. — Ursula Le Guin`,
    type: BlockType.Text,
  },
  // {
  //   content:
  //     "Collagist’s Note: New York is a swarm of signs and unholy advertisements. I encounter haphazard phrases daily like dropped pennies; I pick them up to store in my pocketbook (iPhone Notes App), safekeeping these found letters that have gone on a walk (Walking is reading. Writing is walking): cruel embankments, necrologists of the newspapers, pompous rivers, sozzled, jealous spaghetti",
  //   type: BlockType.Text,
  // },
];

const RightActions = memo(() => (
  <YStack alignItems="center" padding="$2" justifyContent="center">
    <StyledButton
      circular
      size="$6"
      icon={<Icon name="link" type={IconType.FontAwesome6Icon} />}
    ></StyledButton>
  </YStack>
));

const BlockViewImpl = ({
  block,
  isRemoteCollection,
  isVisible,
  setTextFocused,
}: {
  block: Block;
  isRemoteCollection: boolean;
  isVisible: boolean;
  setTextFocused?: (textFocused: boolean) => void;
}) => (
  <Swipeable
    key={block.id}
    containerStyle={
      {
        // overflow: "visible",
      }
    }
    friction={2}
    renderRightActions={() => <RightActions />}
    onSwipeableOpen={(direction, swipeable) => {
      if (direction === "left") {
        return;
      }
      router.push({
        pathname: "/block/[id]/connect",
        params: { id: block.id },
      });
      swipeable.close();
    }}
  >
    <BlockTextSummary
      block={block}
      style={{ maxHeight: 320 }}
      blockStyle={{
        maxHeight: 320,
      }}
      containerProps={{
        maxWidth: "85%",
      }}
      shouldLink
      isRemoteCollection={isRemoteCollection}
      isVisible={isVisible}
      setTextFocused={setTextFocused}
    />
  </Swipeable>
);
const BlockViewWrapped = gestureHandlerRootHOC(BlockViewImpl);

const BlockView = memo(
  ({
    block,
    isRemoteCollection,
    isVisible,
    setTextFocused,
  }: {
    block: Block;
    isRemoteCollection: boolean;
    isVisible: boolean;
    setTextFocused?: (textFocused: boolean) => void;
  }) => (
    <BlockViewWrapped
      block={block}
      isRemoteCollection={isRemoteCollection}
      isVisible={isVisible}
      setTextFocused={setTextFocused}
    />
  )
);

export function BlockTexts({
  blocks,
  collectionId,
  fetchMoreBlocks,
  isFetchingNextPage,
  setTextFocused,
}: {
  blocks: CollectionBlock[] | null;
  collectionId?: string;
  fetchMoreBlocks: () => void;
  isFetchingNextPage: boolean;
  setTextFocused?: (textFocused: boolean) => void;
}) {
  const { getCollection } = useContext(DatabaseContext);
  const [collection, setCollection] = useState<undefined | Collection>(
    undefined
  );
  const [showBackToBottomIndicator, setShowBackToBottomIndicator] =
    useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const debouncedFetchMoreBlocks = useDebounce(fetchMoreBlocks, 300);
  const width = Dimensions.get("window").width;
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    if (collectionId) {
      getCollection(collectionId).then(setCollection);
    }
  }, [collectionId]);

  // const sortedBlocks = useMemo(
  //   () =>
  //     // NOTE: this is sorted descending because we use "inverted" prop on FlatList
  //     // so it is the reverse of what it should be
  //     [...(blocks || [])].sort(
  //       (a, b) =>
  //         // Uses earlier date to match with whether it came from are.na or from Gather first..
  //         getEarlierDate(b.remoteConnectedAt, b.createdAt).getTime() -
  //         getEarlierDate(a.remoteConnectedAt, a.createdAt).getTime()
  //     ),
  //   [blocks]
  // );

  const isRemoteCollection = collection?.remoteSourceType !== undefined;
  const [visibleItems, setVisibleItems] = useState<string[]>([]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleItems(viewableItems.map((item) => item.key));
    },
    []
  );

  const renderBlock = useCallback(
    ({ item }: { item: Block }) => {
      return (
        <BlockView
          key={item.id}
          block={item}
          isRemoteCollection={isRemoteCollection}
          isVisible={visibleItems.includes(item.id)}
          setTextFocused={setTextFocused}
        />
      );
    },
    [isRemoteCollection, visibleItems]
  );

  return !blocks ? (
    <YStack justifyContent="center" alignItems="center" flexGrow={1}>
      <Spinner size="large" color="$orange9" />
    </YStack>
  ) : blocks?.length === 0 && !collectionId ? (
    <ScrollView
      style={{
        overflow: "visible",
      }}
    >
      <YStack
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$4"
        space="$4"
        marginTop="30%"
        flexGrow={1}
        onTouchStart={() => {
          Keyboard.dismiss();
        }}
      >
        <StyledText textAlign="center" fontSize="$5">
          Your messy space for gathering inspiration, moments, and wonderings
        </StyledText>
        <XStack alignItems="center">
          <Carousel
            loop
            autoPlay
            autoPlayInterval={2000}
            width={width}
            data={InspoBlocks}
            mode="parallax"
            height={200}
            withAnimation={{
              type: "spring",
              config: { ...RawAnimations.lazy } as any,
            }}
            modeConfig={{
              parallaxScrollingScale: 0.9,
              parallaxScrollingOffset: 100,
            }}
            style={{
              backgroundColor: "#FFEDBE",
            }}
            renderItem={({ item, index: idx }) => (
              <YStack
                justifyContent="center"
                height="100%"
                alignItems="center"
                paddingHorizontal="$6"
              >
                <BlockContent
                  key={idx}
                  {...item}
                  containerStyle={{}}
                  textContainerProps={{
                    padding: 2,
                  }}
                  textProps={{
                    fontSize: "$1",
                  }}
                />
              </YStack>
            )}
          />
        </XStack>

        <StyledText textAlign="center" fontSize="$5">
          Treat it like texting yourself
        </StyledText>
      </YStack>
    </ScrollView>
  ) : (
    <>
      <FlatList
        renderItem={renderBlock}
        data={blocks}
        scrollEventThrottle={150}
        ref={scrollRef}
        scrollsToTop={false}
        onEndReachedThreshold={0.3}
        onEndReached={debouncedFetchMoreBlocks}
        onScroll={(e) => {
          if (isScrolling) {
            return;
          }
          if (e.nativeEvent.contentOffset.y > 250) {
            setShowBackToBottomIndicator(true);
          } else {
            setShowBackToBottomIndicator(false);
          }
        }}
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
        inverted
        contentContainerStyle={{
          flexGrow: 1,
          marginTop: 8,
          paddingBottom: 16,
          paddingHorizontal: 8,
          gap: 16,
          width: "100%",
          // NOTE: this is handled in BlockTextSummary
          // alignItems: "flex-end",
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 30,
        }}
      ></FlatList>
      {/* TODO: this shows weird if the text field is growing */}
      {showBackToBottomIndicator && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{
            position: "absolute",
            bottom: 85,
            left: 10,
            zIndex: 10,
          }}
        >
          <StyledButton
            height="$3"
            backgroundColor="$gray6"
            paddingHorizontal="$2"
            borderRadius="$8"
            icon={<Icon name="chevron-down" size={20} />}
            onPress={() => {
              setIsScrolling(true);
              setShowBackToBottomIndicator(false);
              scrollRef.current?.scrollToIndex({ animated: false, index: 0 });
              setTimeout(() => {
                setIsScrolling(false);
              }, 1000);
            }}
          ></StyledButton>
        </Animated.View>
      )}
    </>
  );
}
