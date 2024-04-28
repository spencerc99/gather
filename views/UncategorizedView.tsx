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
  useTotalBlockCount,
  useUncategorizedBlocks,
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

export function UncategorizedView() {
  const { addConnections, deleteBlock } = useContext(DatabaseContext);
  const { data: totalBlocks } = useTotalBlockCount();
  const { data: events } = useUncategorizedBlocks();

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
    async (itemId: string, selectedCollections: string[]) => {
      if (!events) {
        return;
      } else if (events.length === 1) {
        // addConnections(events[currentIndex!].id, selectedCollections);
        // setSelectedCollections([]);
        // setEvents([]);
        await addConnections(itemId, selectedCollections);
        // setEvents([]);
      } else {
        await addConnections(itemId, selectedCollections);
        // setEvents(events.filter((block) => block.id !== itemId));
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
    async (blockId: string) => {
      if (!events) {
        return;
      }
      await deleteBlock(blockId);
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
          {index + 1} / {events.length} unsorted,{" "}
          {totalBlocks === null ? "..." : totalBlocks} total
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
        {totalBlocks} total blocks
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
          // this is for scrolling really fast
          // pagingEnabled={false}
          minScrollDistancePerSwipe={0.01}
          scrollAnimationDuration={50}
          width={width}
          data={events}
          windowSize={5}
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
