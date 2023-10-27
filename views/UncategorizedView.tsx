import { useContext, useEffect, useState } from "react";
import { Stack as NavigationStack } from "expo-router";
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
import Carousel from "react-native-reanimated-carousel";
import { SelectConnectionsList } from "../components/SelectConnectionsList";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function UncategorizedView() {
  const { db, blocks, addConnections } = useContext(DatabaseContext);
  const [events, setEvents] = useState<Block[] | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  useEffect(() => {
    void fetchEvents();
  }, [blocks.length]);

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

    setEvents(
      events.rows.map((event) => {
        const mapped = mapSnakeCaseToCamelCaseProperties(event);
        return {
          ...mapped,
          createdAt: convertDbTimestampToDate(mapped.createdTimestamp),
        } as Block;
      })
    );
  }

  function renderBlock(block: Block) {
    return (
      <BlockSummary
        block={block}
        key={block.id}
        style={{
          maxHeight: "100%",
        }}
      />
    );
  }

  const width = Dimensions.get("window").width;
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return !events ? (
    <Spinner size="large" />
  ) : events.length === 0 ? (
    <StyledText>No uncategorized blocks</StyledText>
  ) : (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "position" : "height"}
      // TODO: try switching back to padding when fixing the keyboard-dynamic height thing below
      // behavior={Platform.OS === "ios" ? "padding" : "height"}
      contentContainerStyle={{
        flex: 1,
      }}
      keyboardVerticalOffset={insets.top + 84}
    >
      <NavigationStack.Screen
        options={{
          headerTitle: `${currentIdx + 1} / ${events.length} unsorted`,
          headerShown: true,
        }}
      />
      <YStack flex={1} justifyContent="space-between">
        <Carousel
          loop={false}
          withAnimation={{
            type: "spring",
            config: {
              damping: 15,
              mass: 1.2,
              stiffness: 150,
            },
          }}
          width={width}
          data={events}
          scrollAnimationDuration={1000}
          onScrollBegin={() => {
            Keyboard.dismiss();
          }}
          onSnapToItem={(index) => {
            setCurrentIdx(index);
            const newBlock = events[index];
            if (selectedCollections.length && currentBlockId) {
              addConnections(currentBlockId, selectedCollections);
              setSelectedCollections([]);
              setEvents(events.filter((block) => block.id !== currentBlockId));
            }
            setCurrentBlockId(newBlock.id);
          }}
          renderItem={({ item, index }) => (
            <>
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
              </YStack>
              <Stack
                backgroundColor={theme.background.get()}
                paddingHorizontal="$1"
              >
                <SelectConnectionsList
                  selectedCollections={
                    item.id === currentBlockId ? selectedCollections : []
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
