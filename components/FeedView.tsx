import { useContext, useEffect, useState } from "react";
import {
  Block,
  DatabaseContext,
  mapSnakeCaseToCamelCaseProperties,
} from "../utils/db";
import { SearchBarInput, StyledView } from "./Themed";
import { Pressable, StyleSheet } from "react-native";
import { BlockSummary } from "./BlockSummary";
import { Link } from "expo-router";
import { H2, YStack } from "tamagui";
import { convertDbTimestampToDate } from "../utils/date";

export function FeedView() {
  const { blocks } = useContext(DatabaseContext);

  blocks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  function renderBlock(block: Block) {
    return (
      <Link
        href={{
          pathname: "/block/[id]/",
          params: { id: block.id },
        }}
        key={block.id}
        asChild
      >
        <Pressable>
          <BlockSummary block={block} />
        </Pressable>
      </Link>
    );
  }

  // TODO: use tabs to render blocks + collections
  return <StyledView style={styles.feed}>{blocks.map(renderBlock)}</StyledView>;
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

export function UncategorizedView() {
  const { db } = useContext(DatabaseContext);
  const [events, setEvents] = useState<Block[]>([]);

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

  const [searchValue, setSearchValue] = useState("");

  const filteredBlocks = events.filter((block) =>
    // TODO: handle date search
    [block.title, block.content, block.source, block.description]
      .filter((b) => Boolean(b))
      .join("\n")
      .toLocaleLowerCase()
      .includes(searchValue.toLocaleLowerCase())
  );

  return (
    <>
      <H2>Uncategorized</H2>
      <YStack space="$2" paddingHorizontal="$2">
        <SearchBarInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
        <StyledView style={styles.feed}>
          {filteredBlocks.map(renderBlock)}
        </StyledView>
      </YStack>
    </>
  );
}
