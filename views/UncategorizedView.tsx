import { useContext, useEffect, useState } from "react";
import {
  Block,
  DatabaseContext,
  mapSnakeCaseToCamelCaseProperties,
} from "../utils/db";
import { StyledButton, StyledText, StyledView } from "../components/Themed";
import { Dimensions, Pressable, StyleSheet } from "react-native";
import { BlockSummary } from "../components/BlockSummary";
import { H2, ScrollView, XStack, YStack } from "tamagui";
import { convertDbTimestampToDate } from "../utils/date";
import { Collection } from "../utils/dataTypes";
import Carousel from "react-native-reanimated-carousel";
import { SelectConnectionsList } from "../components/SelectConnectionsList";

export function UncategorizedView() {
  const { db, collections, addConnections } = useContext(DatabaseContext);
  const [events, setEvents] = useState<Block[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  useEffect(() => {
    void fetchEvents();
  }, []);

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
    return <BlockSummary block={block} key={block.id} />;
  }

  function renderCollection(collection: Collection) {
    return (
      <StyledButton
        key={collection.id}
        paddingHorizontal="$2"
        paddingVertical="$1"
        borderRadius="$1"
        onPress={() => {}}
      >
        <StyledText ellipse={true}>{collection.title}</StyledText>
      </StyledButton>
    );
  }
  const width = Dimensions.get("window").width;

  return (
    <YStack paddingTop="$3">
      <YStack height="50%">
        <Carousel
          width={width}
          data={events}
          scrollAnimationDuration={1000}
          onSnapToItem={(index) => {
            if (selectedCollections.length && currentBlockId) {
              addConnections(currentBlockId, selectedCollections);
              setSelectedCollections([]);
              setEvents(events.filter((_, i) => i !== index));
            }
            setCurrentBlockId(events[index].id);
          }}
          renderItem={({ item, index }) => (
            <YStack flex={1} alignItems="center" space="$3">
              <StyledText>
                {index + 1} / {events.length} unsorted
              </StyledText>
              {renderBlock(item)}
            </YStack>
          )}
        />
      </YStack>
      <YStack paddingHorizontal="$2">
        <SelectConnectionsList
          selectedCollections={selectedCollections}
          setSelectedCollections={setSelectedCollections}
        />
      </YStack>
      {/* <ScrollView horizontal>
        <XStack space="$1">{collections.map(renderCollection)}</XStack>
      </ScrollView> */}
    </YStack>
  );
}

const styles = StyleSheet.create({
  feed: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
});
