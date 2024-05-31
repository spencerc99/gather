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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { BlockSummary } from "../components/BlockSummary";
import { SizableText, Spinner, Stack, XStack, YStack, useTheme } from "tamagui";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { SelectCollectionsList } from "../components/SelectCollectionsList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { UserContext } from "../utils/user";

export function UncategorizedView() {
  const { addConnections, deleteBlock } = useContext(DatabaseContext);
  const { currentUser } = useContext(UserContext);
  const { data: totalBlocks } = useTotalBlockCount();
  const { data: events } = useUncategorizedBlocks();

  const renderBlock = useCallback((block: Block) => {
    return (
      <BlockSummary
        block={block}
        key={block.id}
        editable={true}
        style={{
          width: "100%",
          height: "100%",
        }}
        containerProps={{
          width: "90%",
          aspectRatio: 1,
          marginBottom: "$8",
        }}
      />
    );
  }, []);

  const onClickConnect = useCallback(
    async (itemId: string, selectedCollections: string[]) => {
      if (!events) {
        return;
      } else {
        await addConnections(itemId, selectedCollections, currentUser!.id);
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
          marginTop="$1"
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
          {renderBlock(item)}
          <XStack
            position="absolute"
            bottom={6}
            gap="$2"
            alignItems="center"
            opacity={selectedCollections.length > 0 ? 1 : 0}
          >
            <StyledButton
              elevate
              size="$medium"
              onPress={() => {
                onClickConnect(item.id, selectedCollections);
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
              elevate
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
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        extraScrollHeight={80}
        keyboardOpeningTime={0}
      >
        <Stack minHeight="100%">
          <XStack flex={1} flexGrow={1}>
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
        </Stack>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
