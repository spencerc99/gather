import { useContext, useEffect, useState } from "react";
import {
  Block,
  DatabaseContext,
  mapSnakeCaseToCamelCaseProperties,
} from "../utils/db";
import { StyledButton, StyledText } from "../components/Themed";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlockSummary } from "../components/BlockSummary";
import { YStack } from "tamagui";
import { convertDbTimestampToDate } from "../utils/date";
import { Collection } from "../utils/dataTypes";
import Carousel from "react-native-reanimated-carousel";
import { SelectConnectionsList } from "../components/SelectConnectionsList";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function UncategorizedView() {
  const { db, blocks, addConnections } = useContext(DatabaseContext);
  const [events, setEvents] = useState<Block[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "position" : "height"}
      contentContainerStyle={{
        flex: 1,
      }}
      keyboardVerticalOffset={insets.top + 84}
    >
      <Carousel
        loop={false}
        width={width}
        data={events}
        scrollAnimationDuration={1000}
        onScrollBegin={() => {
          Keyboard.dismiss();
        }}
        onSnapToItem={(index) => {
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
              minHeight="50%"
              maxHeight="80%"
              alignItems="center"
              space="$2"
              justifyContent="center"
            >
              <StyledText>
                {index + 1} / {events.length} unsorted
              </StyledText>
              {renderBlock(item)}
            </YStack>
            <YStack paddingHorizontal="$2">
              <SelectConnectionsList
                selectedCollections={
                  item.id === currentBlockId ? selectedCollections : []
                }
                setSelectedCollections={setSelectedCollections}
                horizontal
              />
            </YStack>
          </>
        )}
      />
    </KeyboardAvoidingView>
  );
}
