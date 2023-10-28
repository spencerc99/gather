import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Block,
  DatabaseContext,
  mapSnakeCaseToCamelCaseProperties,
} from "../utils/db";
import {
  StyledButton,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlockSummary } from "../components/BlockSummary";
import { Spinner, Stack, XStack, YStack, useTheme } from "tamagui";
import { convertDbTimestampToDate } from "../utils/date";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { SelectConnectionsList } from "../components/SelectConnectionsList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

export function UncategorizedView() {
  const { db, blocks, addConnections } = useContext(DatabaseContext);
  const [events, setEvents] = useState<Block[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  useFocusEffect(() => {
    void fetchEvents();
    // TODO: this is insufficient bc you could have unconnected blocks.
  });

  async function fetchEvents() {
    const [events] = await db.execAsync(
      [
        {
          sql: `
        SELECT * FROM (
        SELECT  blocks.id,
                blocks.content,
                blocks.title,
                blocks.type,
                blocks.source,
                blocks.created_timestamp,
                COUNT(connections.collection_id) AS collection_count
        FROM blocks
        LEFT JOIN connections ON connections.block_id = blocks.id
        GROUP BY 1,2,3,4,5,6) AS c
        WHERE c.collection_count = 0
        ORDER BY c.created_timestamp DESC;`,
          // TODO: add this after migrating table
          // WHERE user_id = ?
          args: [],
        },
      ],
      true
    );

    if ("error" in events) {
      throw events.error;
    }

    const newEvents = events.rows.map((event) => {
      const mapped = mapSnakeCaseToCamelCaseProperties(event);
      return {
        ...mapped,
        createdAt: convertDbTimestampToDate(mapped.createdTimestamp),
      } as Block;
    });
    setEvents(newEvents);
    if (newEvents.length) {
      setCurrentIndex(0);
    }
  }

  function renderBlock(block: Block) {
    return (
      <BlockSummary
        hideHoldMenu
        block={block}
        key={block.id}
        style={{
          maxHeight: "100%",
        }}
      />
    );
  }

  function onClickConnect() {
    if (!events) {
      return;
    } else if (events.length === 1) {
      addConnections(events[currentIndex!].id, selectedCollections);
      setSelectedCollections([]);
      setEvents([]);
    } else {
      carouselRef.current?.next();
    }
  }

  const width = Dimensions.get("window").width;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const carouselRef = useRef<ICarouselInstance>(null);

  return !events ? (
    <Spinner size="large" />
  ) : events.length === 0 ? (
    <YStack
      height="100%"
      justifyContent="center"
      alignItems="center"
      paddingHorizontal="$4"
      space="$3"
    >
      {/* TODO: fix this, not sure why it isn't cycling */}
      {/* {<CyclingRecentBlocks />} */}
      <StyledText textAlign="center" fontSize="$7">
        No uncategorized items! Text yourself some more and come back later :)
      </StyledText>
    </YStack>
  ) : (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "position" : "height"}
      // TODO: try switching back to padding when fixing the keyboard-dynamic height thing below
      // behavior={Platform.OS === "ios" ? "padding" : "height"}
      contentContainerStyle={{
        flex: 1,
      }}
      keyboardVerticalOffset={insets.top + 60}
    >
      {/* TODO: add a undo button to header? */}
      <YStack flex={1} justifyContent="space-between">
        <Carousel
          ref={carouselRef}
          loop={false}
          withAnimation={{
            type: "spring",
            config: {
              damping: 15,
              mass: 1,
              stiffness: 150,
            },
          }}
          width={width}
          data={events}
          scrollAnimationDuration={1000}
          onScrollBegin={() => {
            // TODO: bring this back when you resolve the
            // propagation from trying to touch the selectcollections input
            // Keyboard.dismiss();
          }}
          // TODO: after solving above can remove this.
          onScrollEnd={() => {
            Keyboard.dismiss();
          }}
          onSnapToItem={(index) => {
            if (currentIndex === index) {
              return;
            }
            if (selectedCollections.length && currentIndex !== null) {
              const currentBlockId = events[currentIndex].id;
              addConnections(currentBlockId, selectedCollections);
              setSelectedCollections([]);
              setEvents(events.filter((block) => block.id !== currentBlockId));
              if (index > currentIndex && index > 0) {
                carouselRef.current?.prev({ animated: false });
                setCurrentIndex(currentIndex - 1);
                return;
              }
            }
            setCurrentIndex(index);
          }}
          renderItem={({ item, index }) => (
            <>
              <StyledText
                marginBottom="auto"
                textAlign="center"
                width="100%"
                marginTop="$1"
              >
                {index + 1} / {events.length} unsorted
              </StyledText>
              <YStack
                paddingVertical="$2"
                // NOTE: minHeight is ideal here for aesthetic but we need to handle
                // when keyboard comes up for it to shrink
                // TODO: make this work, doesn't rn because ther's no listener to re-render when keyboard appears
                maxHeight={Keyboard.isVisible() ? "40%" : undefined}
                alignItems="center"
                space="$2"
                justifyContent="center"
                flexGrow={1}
              >
                {renderBlock(item)}
                <XStack
                  position="absolute"
                  bottom={6}
                  space="$2"
                  opacity={
                    currentIndex !== null &&
                    item.id === events[currentIndex]?.id &&
                    selectedCollections.length > 0
                      ? 1
                      : 0
                  }
                >
                  <StyledButton
                    elevate
                    onPress={onClickConnect}
                    borderRadius={20}
                    iconAfter={
                      <StyledText>
                        ({selectedCollections.length.toString()})
                      </StyledText>
                    }
                  >
                    {events.length > 1 ? "Swipe to connect" : "Connect"}
                  </StyledButton>
                  <StyledButton
                    elevate
                    theme="red"
                    circular
                    onPress={() => {
                      setSelectedCollections([]);
                    }}
                  >
                    X
                  </StyledButton>
                </XStack>
              </YStack>
              <Stack
                backgroundColor={theme.background.get()}
                paddingHorizontal="$1"
              >
                <SelectConnectionsList
                  selectedCollections={
                    currentIndex !== null &&
                    item.id === events[currentIndex]?.id
                      ? selectedCollections
                      : []
                  }
                  setSelectedCollections={setSelectedCollections}
                  horizontal
                />
              </Stack>
            </>
          )}
        />
      </YStack>
    </KeyboardAvoidingView>
  );
}

function CyclingRecentBlocks() {
  const { blocks } = useContext(DatabaseContext);
  const recentBlocks = useMemo(() => {
    return [...blocks]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);
  }, [blocks]);
  const [currIdx, setCurrIdx] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrIdx((newIdx) => (newIdx + 1) % recentBlocks.length);
    }, 250);

    return clearTimeout(timeout);
  }, [recentBlocks]);

  console.log(currIdx);
  return !blocks.length ? null : (
    <BlockSummary
      block={recentBlocks[currIdx]}
      hideHoldMenu
      hideMetadata
      style={{
        width: 150,
        height: 150,
      }}
    />
  );
}
