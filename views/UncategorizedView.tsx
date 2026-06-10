import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  DatabaseContext,
  useTotalBlockCount,
  useUncategorizedBlocks,
} from "../utils/db";
import { Block } from "../utils/dataTypes";
import { Icon, StyledButton, StyledText } from "../components/Themed";
import {
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  ViewToken,
} from "react-native";
import { BlockSummary } from "../components/BlockSummary";
import {
  H3,
  ScrollView,
  SizableText,
  Spinner,
  Stack,
  XStack,
  YStack,
} from "tamagui";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { SelectCollectionsList } from "../components/SelectCollectionsList";
import { UserContext } from "../utils/user";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const GridGap = 3;

export function UncategorizedView() {
  const { addConnections, deleteBlock } = useContext(DatabaseContext);
  const { currentUser } = useContext(UserContext);
  const { data: totalBlocks } = useTotalBlockCount();
  const { data: events } = useUncategorizedBlocks();
  const bottomTabHeight = useBottomTabBarHeight();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lastSwipeDirection, setLastSwipeDirection] = useState<"next" | "prev">(
    "next",
  );
  const [viewMode, setViewMode] = useState<"swipe" | "grid">("swipe");
  // Blocks multi-selected in grid mode for bulk-connecting to collections.
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  const renderBlock = useCallback(
    (block: Block, idx: number) => {
      return (
        <BlockSummary
          block={block}
          key={block.id}
          editable={true}
          style={{
            height: "100%",
            width: "100%",
          }}
          containerProps={{
            width: "90%",
            maxHeight: "80%",
            marginBottom: "$8",
            justifyContent: "center",
            marginVertical: "auto",
            aspectRatio: 1,
          }}
          blockStyle={{
            resizeMode: "contain",
          }}
          isVisible={currentIdx === idx}
        />
      );
    },
    [currentIdx],
  );

  const onClickConnect = useCallback(
    async (itemId: string, selectedCollections: string[], index: number) => {
      if (!events) {
        return;
      } else {
        if (
          index === events.length - 1 ||
          (lastSwipeDirection === "prev" && index > 0)
        ) {
          carouselRef.current?.prev({ count: 1 });
        }

        await addConnections({
          blockId: itemId,
          connections: selectedCollections.map((c) => ({
            collectionId: c,
            createdBy: currentUser!.id,
          })),
        });
      }
      Keyboard.dismiss();
    },
    [events, lastSwipeDirection],
  );

  const width = Dimensions.get("window").width;
  const gridCellSize = Math.floor(width / 3) - GridGap * 2;
  const carouselRef = useRef<ICarouselInstance>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      if (!events) {
        return;
      }
      await deleteBlock(blockId);
    },
    [events],
  );

  // Connect every grid-selected block to the chosen collections at once.
  const handleBulkConnect = useCallback(async () => {
    if (selectedBlockIds.size === 0 || selectedCollections.length === 0) {
      return;
    }
    Keyboard.dismiss();
    await Promise.all(
      Array.from(selectedBlockIds).map((blockId) =>
        addConnections({
          blockId,
          connections: selectedCollections.map((c) => ({
            collectionId: c,
            createdBy: currentUser!.id,
          })),
        }),
      ),
    );
    setSelectedBlockIds(new Set());
    setSelectedCollections([]);
    setSearchValue("");
  }, [selectedBlockIds, selectedCollections, addConnections, currentUser]);

  // Jump the swipe carousel straight to a block tapped in the grid.
  const jumpToSwipe = useCallback((index: number) => {
    setCurrentIdx(index);
    setViewMode("swipe");
    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ index, animated: false });
    });
  }, []);

  function CarouselItem({ item, index }: { item: Block; index: number }) {
    if (!events) {
      return <></>;
    }

    return (
      <>
        <StyledButton
          position="absolute"
          top={6}
          right={6}
          zIndex={5}
          size="$small"
          icon={<Icon name="trash" />}
          theme="red"
          onPress={() => {
            handleDeleteBlock(item.id);
          }}
        />
        <StyledText
          marginBottom="auto"
          textAlign="center"
          width="100%"
          marginTop="$1.5"
        >
          {index + 1} / {events.length} unconnected,{" "}
          {totalBlocks === null ? "..." : totalBlocks} total
        </StyledText>
        <YStack
          paddingVertical="$2"
          // NOTE: minHeight is ideal here for aesthetic but we need to handle
          // when keyboard comes up for it to shrink
          // TODO: make this work, doesn't rn because ther's no listener to re-render when keyboard appears
          // maxHeight={Keyboard.isVisible() ? "40%" : undefined}
          alignItems="center"
          gap="$2"
          justifyContent="center"
          flexGrow={1}
          flex={1}
        >
          {renderBlock(item, index)}
          <XStack
            position="absolute"
            bottom={6}
            gap="$2"
            alignItems="center"
            opacity={selectedCollections.length > 0 ? 1 : 0}
          >
            <StyledButton
              elevation="$0.5"
              size="$medium"
              onPress={() => {
                onClickConnect(item.id, selectedCollections, index);
                setSearchValue("");
                setSelectedCollections([]);
              }}
              borderRadius={20}
              iconAfter={
                <SizableText>
                  ({selectedCollections.length.toString()})
                </SizableText>
              }
            >
              Connect
            </StyledButton>
            <StyledButton
              elevation="$0.5"
              theme="red"
              circular
              size="$small"
              onPress={() => {
                setSelectedCollections([]);
              }}
              icon={<Icon name="close" />}
            ></StyledButton>
          </XStack>
        </YStack>
      </>
    );
  }

  const keyboard = useAnimatedKeyboard();
  const [collectionsSelectInputFocused, setCollectionsSelectInputFocused] =
    useState<boolean>(false);
  const translateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          // TODO: needs extra padding for android
          translateY: collectionsSelectInputFocused
            ? -(
                keyboard.height.value -
                (Platform.OS === "android"
                  ? 40
                  : Platform.OS === "ios"
                    ? bottomTabHeight
                    : 0)
              )
            : 0,
        },
      ],
    };
  }, [collectionsSelectInputFocused]);

  return !events ? (
    <YStack height="100%" justifyContent="center">
      <Spinner size="large" color="$orange9" />
    </YStack>
  ) : events.length === 0 ? (
    <YStack
      height="100%"
      justifyContent="center"
      alignItems="center"
      paddingHorizontal="$4"
      gap="$3"
    >
      <StyledText
        position="absolute"
        top="$1.5"
        textAlign="center"
        width="100%"
      >
        {totalBlocks} total blocks
      </StyledText>
      <H3 textAlign="center">No uncategorized items!</H3>
    </YStack>
  ) : (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <Animated.View style={{ ...translateStyle }}>
        <Stack minHeight="100%">
          {/* Focused (swipe) / Grid view toggle — matches the Review view's
              single toggle button that swaps icons. */}
          <StyledButton
            position="absolute"
            top={8}
            left={10}
            zIndex={10}
            size="$small"
            backgroundColor="$gray6"
            icon={<Icon name={viewMode === "swipe" ? "grid" : "image"} />}
            onPress={() =>
              setViewMode((m) => (m === "swipe" ? "grid" : "swipe"))
            }
          />

          {viewMode === "swipe" ? (
            <XStack
              flex={1}
              flexGrow={1}
              onTouchMove={() => Keyboard.dismiss()}
            >
              <Carousel
                ref={carouselRef}
                loop={false}
                // TODO: this isn't actually available in this source in this version but seemingly does something? i literally have no idea why
                // @ts-ignore
                minScrollDistancePerSwipe={0.1}
                withAnimation={{
                  type: "spring",
                  config: {
                    damping: 40,
                    mass: 1.2,
                    stiffness: 250,
                  },
                }}
                snapEnabled
                width={width}
                data={events}
                windowSize={5}
                renderItem={({ item, index }) => CarouselItem({ item, index })}
                onSnapToItem={(index) => {
                  if (index > currentIdx) {
                    setLastSwipeDirection("next");
                  } else if (index < currentIdx) {
                    setLastSwipeDirection("prev");
                  }
                  setCurrentIdx(index);
                }}
              />
            </XStack>
          ) : (
            <YStack flex={1} flexGrow={1}>
              <StyledText textAlign="center" marginTop="$1.5" marginBottom="$1">
                {events.length} unconnected,{" "}
                {totalBlocks === null ? "..." : totalBlocks} total
              </StyledText>
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                numColumns={3}
                onTouchMove={() => Keyboard.dismiss()}
                contentContainerStyle={{
                  paddingHorizontal: GridGap,
                  paddingBottom: 16,
                }}
                renderItem={({ item, index }) => {
                  const selected = selectedBlockIds.has(item.id);
                  return (
                    <Pressable
                      onPress={() => toggleBlockSelection(item.id)}
                      style={{
                        width: gridCellSize,
                        height: gridCellSize,
                        margin: GridGap,
                      }}
                    >
                      <YStack
                        width="100%"
                        height="100%"
                        borderRadius={8}
                        overflow="hidden"
                        backgroundColor="$gray3"
                        borderWidth={2}
                        borderColor={selected ? "$orange9" : "transparent"}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <BlockSummary
                          block={item}
                          hideHoldMenu
                          hideMetadata
                          editable={false}
                          isVisible={false}
                          containerProps={{
                            width: "100%",
                            height: "100%",
                            gap: 0,
                            justifyContent: "center",
                          }}
                          style={{ width: "100%", height: "100%" }}
                          blockStyle={{ resizeMode: "cover" }}
                        />
                      </YStack>
                      {/* Selection badge */}
                      <YStack
                        position="absolute"
                        top={6}
                        right={6}
                        width={22}
                        height={22}
                        borderRadius={11}
                        borderWidth={1.5}
                        borderColor="white"
                        backgroundColor={
                          selected ? "$orange9" : "rgba(0,0,0,0.25)"
                        }
                        alignItems="center"
                        justifyContent="center"
                      >
                        {selected && (
                          <Icon name="checkmark" color="white" size={14} />
                        )}
                      </YStack>
                      {/* Jump to this item in swipe view */}
                      <StyledButton
                        position="absolute"
                        bottom={4}
                        right={4}
                        size="$1"
                        circular
                        chromeless
                        backgroundColor="rgba(0,0,0,0.45)"
                        icon={<Icon name="expand" color="white" size={12} />}
                        onPress={() => jumpToSwipe(index)}
                      />
                    </Pressable>
                  );
                }}
              />
            </YStack>
          )}

          <Stack paddingHorizontal="$1">
            {viewMode === "grid" && selectedBlockIds.size > 0 && (
              <XStack
                paddingHorizontal="$2"
                paddingVertical="$1.5"
                gap="$2"
                alignItems="center"
                justifyContent="space-between"
              >
                <StyledText>{selectedBlockIds.size} selected</StyledText>
                <XStack gap="$2" alignItems="center">
                  <StyledButton
                    theme="red"
                    circular
                    size="$small"
                    icon={<Icon name="close" />}
                    onPress={() => setSelectedBlockIds(new Set())}
                  />
                  <StyledButton
                    size="$medium"
                    borderRadius={20}
                    disabled={selectedCollections.length === 0}
                    opacity={selectedCollections.length === 0 ? 0.5 : 1}
                    onPress={handleBulkConnect}
                    iconAfter={
                      <SizableText>
                        ({selectedCollections.length.toString()})
                      </SizableText>
                    }
                  >
                    Connect
                  </StyledButton>
                </XStack>
              </XStack>
            )}
            <SelectCollectionsList
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              selectedCollections={selectedCollections}
              setSelectedCollections={setSelectedCollections}
              horizontal
              onFocusInputChange={(isFocused) =>
                setCollectionsSelectInputFocused(isFocused)
              }
            />
          </Stack>
        </Stack>
      </Animated.View>
    </SafeAreaView>
  );
}
