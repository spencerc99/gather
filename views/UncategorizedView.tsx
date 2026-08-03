// ABOUTME: Renders uncategorized blocks for selection, connection, and editing.
// ABOUTME: Provides grid and focused-carousel views for organizing content.
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DatabaseContext,
  useTotalBlockCount,
  useUncategorizedBlocks,
} from "../utils/db";
import { Block } from "../utils/dataTypes";
import {
  Icon,
  IconType,
  StyledButton,
  StyledInput,
  StyledText,
} from "../components/Themed";
import {
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
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

// Memoized so toggling one item's selection only re-renders that cell rather
// than every BlockSummary in the grid (the main cause of slow selection).
const OrganizeGridCell = memo(function OrganizeGridCell({
  block,
  index,
  selected,
  cellSize,
  onToggle,
  onOpen,
}: {
  block: Block;
  index: number;
  selected: boolean;
  cellSize: number;
  onToggle: (id: string) => void;
  onOpen: (index: number) => void;
}) {
  return (
    <Pressable
      onPress={() => onToggle(block.id)}
      style={{ width: cellSize, height: cellSize, margin: GridGap }}
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
          block={block}
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
        backgroundColor={selected ? "$orange9" : "rgba(0,0,0,0.25)"}
        alignItems="center"
        justifyContent="center"
      >
        {selected && <Icon name="checkmark" color="white" size={14} />}
      </YStack>
      {/* Open this item in the focused carousel (secondary) */}
      <StyledButton
        position="absolute"
        bottom={6}
        right={6}
        size="$tiny"
        circular
        borderWidth={0}
        backgroundColor="rgba(0,0,0,0.4)"
        icon={
          <Icon name="expand" type={IconType.FontAwesomeIcon} color="white" />
        }
        onPress={() => onOpen(index)}
      />
    </Pressable>
  );
});

export function UncategorizedView() {
  const { addConnections, deleteBlock, updateBlock } =
    useContext(DatabaseContext);
  const { currentUser } = useContext(UserContext);
  const { data: totalBlocks } = useTotalBlockCount();
  const { data: events } = useUncategorizedBlocks();
  const bottomTabHeight = useBottomTabBarHeight();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lastSwipeDirection, setLastSwipeDirection] = useState<"next" | "prev">(
    "next",
  );
  // Grid is the default home view; you drill into the carousel to focus one item.
  const [viewMode, setViewMode] = useState<"swipe" | "grid">("grid");
  // Blocks multi-selected in grid mode for bulk actions (connect / title).
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    new Set(),
  );
  // Bulk-title dialog state.
  const [bulkTitleVisible, setBulkTitleVisible] = useState(false);
  const [bulkTitleValue, setBulkTitleValue] = useState("");

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
          zoomable
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

  // Apply a single title to every grid-selected block.
  const handleBulkTitle = useCallback(async () => {
    const title = bulkTitleValue.trim();
    if (!title || selectedBlockIds.size === 0) {
      setBulkTitleVisible(false);
      return;
    }
    await Promise.all(
      Array.from(selectedBlockIds).map((blockId) =>
        updateBlock({ blockId, editInfo: { title } }),
      ),
    );
    setBulkTitleValue("");
    setBulkTitleVisible(false);
    // Keep the selection so the user can connect the titled items next.
  }, [bulkTitleValue, selectedBlockIds, updateBlock]);

  // Open a block from the grid in the focused carousel ("drill in").
  const openInCarousel = useCallback((index: number) => {
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
          {/* Header row. Grid is home; the carousel is a drill-in with a back
              button to return. Single flex row keeps the buttons aligned. */}
          <XStack
            alignItems="center"
            paddingHorizontal={6}
            paddingTop={6}
            gap="$2"
          >
            {viewMode === "swipe" ? (
              <StyledButton
                size="$small"
                backgroundColor="$gray6"
                icon={<Icon name="chevron-back" />}
                onPress={() => setViewMode("grid")}
              />
            ) : (
              // Spacer to keep the count centered.
              <Stack width={40} />
            )}
            <StyledText flex={1} textAlign="center">
              {viewMode === "swipe" ? `${currentIdx + 1} / ` : ""}
              {events.length} unconnected,{" "}
              {totalBlocks === null ? "..." : totalBlocks} total
            </StyledText>
            {viewMode === "swipe" ? (
              <StyledButton
                size="$small"
                icon={<Icon name="trash" />}
                theme="red"
                onPress={() => {
                  const current = events[currentIdx];
                  if (current) {
                    handleDeleteBlock(current.id);
                  }
                }}
              />
            ) : (
              // Spacer to keep the count centered when the trash is hidden.
              <Stack width={40} />
            )}
          </XStack>

          {viewMode === "swipe" ? (
            <XStack
              flex={1}
              flexGrow={1}
              onTouchMove={() => Keyboard.dismiss()}
            >
              <Carousel
                ref={carouselRef}
                loop={false}
                // Open at the drilled-in item when entering from the grid.
                defaultIndex={currentIdx}
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
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                numColumns={3}
                onTouchMove={() => Keyboard.dismiss()}
                contentContainerStyle={{
                  paddingHorizontal: GridGap,
                  paddingBottom: 16,
                }}
                removeClippedSubviews
                initialNumToRender={15}
                maxToRenderPerBatch={9}
                windowSize={5}
                getItemLayout={(_, index) => {
                  const rowHeight = gridCellSize + GridGap * 2;
                  return {
                    length: rowHeight,
                    offset: rowHeight * index,
                    index,
                  };
                }}
                renderItem={({ item, index }) => (
                  <OrganizeGridCell
                    block={item}
                    index={index}
                    selected={selectedBlockIds.has(item.id)}
                    cellSize={gridCellSize}
                    onToggle={toggleBlockSelection}
                    onOpen={openInCarousel}
                  />
                )}
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
                <XStack gap="$1.5" alignItems="center">
                  <StyledButton
                    size="$tiny"
                    theme="red"
                    icon={<Icon name="close" />}
                    onPress={() => setSelectedBlockIds(new Set())}
                  />
                  <StyledText>{selectedBlockIds.size} selected</StyledText>
                </XStack>
                <XStack gap="$2" alignItems="center">
                  <StyledButton
                    size="$small"
                    theme="gray"
                    icon={<Icon name="pencil" />}
                    onPress={() => {
                      setBulkTitleValue("");
                      setBulkTitleVisible(true);
                    }}
                  />
                  <StyledButton
                    size="$small"
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
            {/* In grid view, hide the collection picker until items are
                selected so the grid is unobstructed while navigating. */}
            {(viewMode === "swipe" || selectedBlockIds.size > 0) && (
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
            )}
          </Stack>
        </Stack>
      </Animated.View>

      {/* Bulk-title dialog: one title applied to all selected items */}
      <Modal
        visible={bulkTitleVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkTitleVisible(false)}
      >
        <YStack
          flex={1}
          backgroundColor="rgba(0,0,0,0.4)"
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="$4"
        >
          <YStack
            width="100%"
            maxWidth={360}
            backgroundColor="$background"
            borderRadius={16}
            padding="$4"
            gap="$3"
          >
            <StyledText bold size="$5">
              Title {selectedBlockIds.size} item
              {selectedBlockIds.size > 1 ? "s" : ""}
            </StyledText>
            <StyledInput
              value={bulkTitleValue}
              onChangeText={setBulkTitleValue}
              placeholder="Enter a title for all selected"
              autoFocus
              onSubmitEditing={handleBulkTitle}
            />
            <XStack gap="$2" justifyContent="flex-end">
              <StyledButton
                chromeless
                theme="gray"
                pressStyle={{ backgroundColor: "$gray5" }}
                onPress={() => setBulkTitleVisible(false)}
              >
                Cancel
              </StyledButton>
              <StyledButton
                theme="green"
                disabled={!bulkTitleValue.trim()}
                opacity={!bulkTitleValue.trim() ? 0.5 : 1}
                onPress={handleBulkTitle}
              >
                Apply
              </StyledButton>
            </XStack>
          </YStack>
        </YStack>
      </Modal>
    </SafeAreaView>
  );
}
