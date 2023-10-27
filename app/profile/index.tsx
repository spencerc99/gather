import { Pressable, StyleSheet } from "react-native";
import { useContext, useEffect, useState } from "react";
import {
  DatabaseContext,
  mapSnakeCaseToCamelCaseProperties,
} from "../../utils/db";
import { CollectionSummary } from "../../components/CollectionSummary";
import { CreateCollectionButton } from "../../components/CreateCollectionButton";
import {
  Avatar,
  ScrollView,
  Separator,
  SizableText,
  Tabs,
  TabsContentProps,
  Theme,
  XStack,
  YStack,
  useTheme,
} from "tamagui";
import { Link } from "expo-router";
import { FeedView } from "../../components/FeedView";
import { StyledParagraph } from "../../components/Themed";
import { convertDbTimestampToDate, getRelativeDate } from "../../utils/date";
import { BlockSummary } from "../../components/BlockSummary";
import { BlockType } from "../../utils/mimeTypes";
import { currentUser } from "../../utils/user";

export default function ProfileScreen() {
  // TODO: change this to show events, group them by date.
  /* TODO: show profile information */

  const user = currentUser();

  return (
    <>
      {/* TODO: finish user info */}
      <YStack space="$2" padding="$4" alignItems="center">
        <Avatar size="$6" circular>
          {/* <Avatar.Image
            // accessibilityLabel={user.name}
            // src={user.imgSrc}
            src={
              "https://images.unsplash.com/photo-1548142813-c348350df52b?&w=150&h=150&dpr=2&q=80"
            }
          /> */}
          <Avatar.Fallback backgroundColor="$orange8" />
        </Avatar>
        <StyledParagraph title>{user.id}</StyledParagraph>
        <StyledParagraph metadata>
          joined {getRelativeDate(new Date("2023-10-01"))}
        </StyledParagraph>
      </YStack>
      <Tabs
        defaultValue="timeline"
        orientation="horizontal"
        flexDirection="column"
        borderRadius="$4"
        borderWidth="$0.25"
        height="100%"
        overflow="hidden"
        borderColor="$borderColor"
      >
        <Theme name="green">
          <Tabs.List
            separator={<Separator vertical />}
            disablePassBorderRadius="bottom"
          >
            <Tabs.Tab flex={1} value="timeline">
              <SizableText>Timeline</SizableText>
            </Tabs.Tab>
            <Tabs.Tab flex={1} value="collections">
              <SizableText>Collections</SizableText>
            </Tabs.Tab>
            <Tabs.Tab flex={1} value="blocks">
              <SizableText>Blocks</SizableText>
            </Tabs.Tab>
          </Tabs.List>
        </Theme>
        <Separator />
        <ScrollView
          backgroundColor="$green4"
          minHeight="100%"
          flex={1}
          contentContainerStyle={{
            // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
            paddingBottom: 128,
          }}
        >
          <TabsContent value="timeline">
            <TimelineView />
          </TabsContent>

          <TabsContent value="collections">
            <CollectionsView />
          </TabsContent>

          <TabsContent value="blocks">
            <FeedView />
          </TabsContent>
        </ScrollView>
      </Tabs>
    </>
  );
}

const TabsContent = (props: TabsContentProps) => {
  return (
    <Tabs.Content
      backgroundColor="$green4"
      flex={1}
      paddingHorizontal="5%"
      paddingTop="5%"
      borderColor="$green4"
      borderRadius="$2"
      borderTopLeftRadius={0}
      borderTopRightRadius={0}
      borderWidth="$2"
      paddingBottom={64}
      {...props}
    >
      {props.children}
    </Tabs.Content>
  );
};

interface Event {
  blockId: string;
  blockContent: string;
  blockType: BlockType;
  blockTitle?: string;
  blockSource?: string;
  collectionId: string;
  collectionTitle: string;
  createdAt: Date;
  blockCreatedAt: Date;
  createdBy: string;
}

export function TimelineView() {
  const { db } = useContext(DatabaseContext);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    void fetchEvents();
  }, []);

  async function fetchEvents() {
    const [events] = await db.execAsync(
      [
        {
          sql: `
        SELECT  connections.created_timestamp as created_at,
                blocks.id AS block_id,
                blocks.content AS block_content,
                blocks.title AS block_title,
                blocks.type AS block_type,
                blocks.source AS block_source,
                blocks.created_timestamp AS block_created_at,
                collections.id AS collection_id,
                collections.title AS collection_title
        FROM connections
        INNER JOIN blocks ON connections.block_id = blocks.id
        INNER JOIN collections ON connections.collection_id = collections.id
        ORDER BY connections.created_timestamp DESC
        LIMIT 10;`,
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
          createdAt: convertDbTimestampToDate(mapped.createdAt),
          blockCreatedAt: convertDbTimestampToDate(mapped.blockCreatedAt),
        } as Event;
      })
    );
  }

  const theme = useTheme();

  function renderEvent(event: Event) {
    return (
      <YStack
        key={event.createdAt.getTime()}
        borderWidth={1}
        borderRadius={4}
        borderColor={theme.color.get()}
        backgroundColor={theme.background.get()}
        space="$2"
        padding="$3"
        width="100%"
      >
        {/* {event.createdBy}  */}
        <StyledParagraph>
          You added to {event.collectionTitle}{" "}
          {getRelativeDate(event.createdAt)}
        </StyledParagraph>
        <XStack justifyContent="center">
          <BlockSummary
            block={{
              id: event.blockId,
              content: event.blockContent,
              title: event.blockTitle,
              type: event.blockType,
              source: event.blockSource,
              createdAt: event.blockCreatedAt,
            }}
            hideMetadata={true}
          />
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack paddingBottom="$4" space="$4" width="100%">
      {events.map(renderEvent)}
    </YStack>
  );
}

export function CollectionsView() {
  const { collections } = useContext(DatabaseContext);

  return (
    <>
      {<CreateCollectionButton />}
      <YStack style={styles.collections}>
        {collections.map((collection) => (
          // TODO: styling is messing up without "asChild" but then the link doesn't work
          <Link
            href={{
              pathname: "/collection/[id]/",
              params: { id: collection.id },
            }}
            key={collection.id}
            asChild
          >
            <Pressable style={styles.contentContainer}>
              <CollectionSummary collection={collection} />
            </Pressable>
          </Link>
        ))}
      </YStack>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: "10%",
  },
  collections: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 48,
    gap: 8,
  },
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
});
