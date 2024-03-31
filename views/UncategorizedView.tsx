import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DatabaseContext,
  mapBlockContentToPath,
  mapSnakeCaseToCamelCaseProperties,
} from "../utils/db";
import { Block } from "../utils/dataTypes";
import {
  Icon,
  StyledButton,
  StyledParagraph,
  StyledText,
  StyledView,
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
import { SelectCollectionsList } from "../components/SelectCollectionsList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

export function UncategorizedView() {
  const { db, blocks, addConnections, getConnectionsForBlock, deleteBlock } =
    useContext(DatabaseContext);
  const [events, setEvents] = useState<Block[] | null>(null);

  const initData = useCallback(() => {
    void fetchEvents();
  }, []);

  useFocusEffect(initData);

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
                COUNT(connections.collection_id) AS num_connections
        FROM blocks
        LEFT JOIN connections ON connections.block_id = blocks.id
        GROUP BY 1,2,3,4,5,6) AS c
        WHERE c.num_connections = 0
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
        content: mapBlockContentToPath(mapped.content, mapped.type),
        createdAt: convertDbTimestampToDate(mapped.createdTimestamp),
      } as Block;
    });
    setEvents(newEvents);
  }

  const renderBlock = useCallback((block: Block) => {
    return (
      <BlockSummary
        block={block}
        key={block.id}
        style={{
          width: "100%",
          height: "100%",
        }}
        containerProps={{
          width: "90%",
          aspectRatio: 1,
        }}
      />
    );
  }, []);

  const onClickConnect = useCallback(
    (itemId: string, selectedCollections: string[]) => {
      if (!events) {
        return;
      } else if (events.length === 1) {
        // addConnections(events[currentIndex!].id, selectedCollections);
        // setSelectedCollections([]);
        // setEvents([]);
        void addConnections(itemId, selectedCollections);
        setEvents([]);
      } else {
        void addConnections(itemId, selectedCollections);
        setEvents(events.filter((block) => block.id !== itemId));
        // carouselRef.current?.next();
      }
      Keyboard.dismiss();
    },
    [events]
  );

  const width = Dimensions.get("window").width;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const carouselRef = useRef<ICarouselInstance>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      if (!events) {
        return;
      }
      void deleteBlock(blockId);
      setEvents(events.filter((block) => block.id !== blockId));
    },
    [events]
  );

  function CarouselItem({ item, index }: { item: Block; index: number }) {
    useEffect(() => {
      // TODO: bring back if putting all blocks here
      // getConnectionsForBlock(item.id).then((connections) => {
      //   setSelectedCollections(
      //     connections.map((connection) => connection.collectionId)
      //   );
      // });
    }, []);

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
          icon={<Icon name="trash" size="$2" />}
          theme="red"
          onPress={() => {
            handleDeleteBlock(item.id);
          }}
        />
        <StyledText
          marginBottom="auto"
          textAlign="center"
          width="100%"
          marginTop="$1"
        >
          {index + 1} / {events.length} unsorted, {blocks.length} total
        </StyledText>
        <YStack
          paddingVertical="$2"
          // NOTE: minHeight is ideal here for aesthetic but we need to handle
          // when keyboard comes up for it to shrink
          // TODO: make this work, doesn't rn because ther's no listener to re-render when keyboard appears
          // maxHeight={Keyboard.isVisible() ? "40%" : undefined}
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
            opacity={selectedCollections.length > 0 ? 1 : 0}
          >
            <StyledButton
              elevate
              onPress={() => {
                onClickConnect(item.id, selectedCollections);
                setSearchValue("");
                setSelectedCollections([]);
              }}
              borderRadius={20}
              iconAfter={
                <StyledText>
                  ({selectedCollections.length.toString()})
                </StyledText>
              }
            >
              {/* {events.length > 1 ? "Swipe to connect" : "Connect"} */}
              Connect
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
      </>
    );
  }

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
      space="$3"
    >
      <StyledText position="absolute" top="$1" textAlign="center" width="100%">
        {blocks.length} total blocks
      </StyledText>
      <StyledText textAlign="center" fontSize="$7">
        No uncategorized items!
      </StyledText>
    </YStack>
  ) : (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      // behavior={Platform.OS === "ios" ? "position" : "height"}
      // TODO: try switching back to padding when fixing the keyboard-dynamic height thing below
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      contentContainerStyle={{
        flexDirection: "column",
      }}
    >
      <XStack flex={1}>
        <Carousel
          ref={carouselRef}
          loop={false}
          withAnimation={{
            type: "spring",
            config: {
              damping: 40,
              mass: 1.2,
              stiffness: 250,
            },
          }}
          width={width}
          data={events}
          windowSize={7}
          renderItem={({ item, index }) => CarouselItem({ item, index })}
        />
      </XStack>
      <Stack paddingHorizontal="$1">
        <SelectCollectionsList
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          selectedCollections={selectedCollections}
          setSelectedCollections={setSelectedCollections}
          horizontal
        />
      </Stack>
    </KeyboardAvoidingView>
  );
}
