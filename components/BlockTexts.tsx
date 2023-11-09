import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "expo-router";
import { Block, DatabaseContext } from "../utils/db";
import { Image, Spinner, XStack, YStack, useTheme } from "tamagui";
import { Icon, StyledButton, StyledParagraph, StyledText } from "./Themed";
import { BlockSummary, BlockTextSummary } from "./BlockSummary";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { FlatList, Keyboard, Pressable, ScrollView } from "react-native";
import { BlockContent } from "./BlockContent";
import { BlockType } from "../utils/mimeTypes";

const InspoBlocks = [
  {
    content: `If it is a human thing to do to put something you want,
because it's useful, edible, or beautiful, into a bag, or a
basket, or a bit of rolled bark or leaf, or a net woven of
your own hair, or what have you, and then take it home
with you, home being another, larger kind of pouch or
bag, a container for people, and then later on you take it
out and eat it or share it or store it up for winter in a
solider container or put it in the medicine bundle or the
shrine or the museum, the holy place, the area that
contains what is sacred, and then next day you probably
do much the same again--if to do that is human, if that's
what it takes, then I am a human being after all. Fully,
freely, gladly, for the first time.`,
    type: BlockType.Text,
  },
  {
    content:
      "https://images.are.na/eyJidWNrZXQiOiJhcmVuYV9pbWFnZXMiLCJrZXkiOiIyNDE5MDc1OS9vcmlnaW5hbF9jMzc4ZGZjZWQ0M2QyM2QxZmIwZWM2Y2YyZWUwNWZiNy5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsid2lkdGgiOjYwMCwiaGVpZ2h0Ijo2MDAsImZpdCI6Imluc2lkZSIsIndpdGhvdXRFbmxhcmdlbWVudCI6dHJ1ZX0sIndlYnAiOnsicXVhbGl0eSI6NzV9LCJwbmciOnsicXVhbGl0eSI6NzV9LCJyb3RhdGUiOm51bGx9fQ==",
    type: BlockType.Image,
  },
  {
    content:
      "Collagist’s Note: New York is a swarm of signs and unholy advertisements. I encounter haphazard phrases daily like dropped pennies; I pick them up to store in my pocketbook (iPhone Notes App), safekeeping these found letters that have gone on a walk (Walking is reading. Writing is walking): cruel embankments, necrologists of the newspapers, pompous rivers, sozzled, jealous spaghetti",
    type: BlockType.Text,
  },
];

export function BlockTexts({ collectionId }: { collectionId?: string }) {
  const { localBlocks: allBlocks, getCollectionItems } =
    useContext(DatabaseContext);

  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    void fetchBlocks();
  }, [collectionId, allBlocks]);

  async function fetchBlocks() {
    if (!collectionId) {
      setBlocks(allBlocks);
      return;
    }
    const collectionBlocks = await getCollectionItems(collectionId);
    setBlocks(collectionBlocks);
  }

  const sortedBlocks = useMemo(
    () =>
      // NOTE: this is sorted descending because we use "inverted" prop on FlatList
      // so it is the reverse of what it should be
      [...(blocks || [])].sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          new Date(b.remoteSourceInfo?.connectedAt || 0).getTime() -
            new Date(a.remoteSourceInfo?.connectedAt || 0).getTime()
      ),
    [blocks]
  );
  const router = useRouter();

  function renderBlock(block: Block) {
    return (
      <Swipeable
        key={block.id}
        containerStyle={{
          overflow: "visible",
        }}
        friction={2}
        renderRightActions={() => (
          <YStack alignItems="center" justifyContent="center" padding="$2">
            <StyledButton circular>
              <Icon name="link" />
            </StyledButton>
          </YStack>
        )}
        onSwipeableOpen={(direction, swipeable) => {
          if (direction === "left") {
            return;
          }
          router.push({
            pathname: "/block/[id]/connect",
            params: { id: block.id },
          });
          swipeable.close();
        }}
      >
        {/* TODO: add Select hold menu item to multiselect */}
        <Link
          href={{
            pathname: "/block/[id]/",
            params: { id: block.id },
          }}
          key={block.id}
          asChild
        >
          <Pressable>
            <BlockTextSummary
              block={block}
              style={{ maxHeight: 320 }}
              blockStyle={{
                maxHeight: 320,
              }}
            />
          </Pressable>
        </Link>
      </Swipeable>
    );
  }

  return blocks === null ? (
    <Spinner size="large" />
  ) : blocks.length === 0 && !collectionId ? (
    <ScrollView
      style={{
        overflowY: "visible",
      }}
    >
      <YStack
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$4"
        space="$4"
        marginTop="30%"
        flexGrow={1}
        onTouchStart={() => {
          Keyboard.dismiss();
        }}
      >
        <XStack alignItems="center">
          {/* TODO: allow you to zoom in */}
          {InspoBlocks.map((block, idx) => (
            <BlockContent
              key={idx}
              {...block}
              containerStyle={{
                width: 120,
                height: 120,
              }}
              textContainerProps={{
                padding: 2,
              }}
              textProps={{
                fontSize: "$1",
              }}
            />
          ))}
        </XStack>
        <StyledText textAlign="center" fontSize="$7">
          Your messy space for gathering inspiration, moments, and wonderings
        </StyledText>
        <StyledText textAlign="center" fontSize="$7">
          Treat it like texting yourself
        </StyledText>
      </YStack>
    </ScrollView>
  ) : (
    // <YStack
    //   paddingBottom="$4"
    //   paddingHorizontal="$2"
    //   space="$4"
    //   width="100%"
    //   flexGrow={1}
    //   marginTop="$2"
    //   alignItems="flex-end"
    // >
    <FlatList
      renderItem={({ item }) => renderBlock(item)}
      data={sortedBlocks}
      scrollEventThrottle={60}
      ref={scrollRef}
      inverted
      // onContentSizeChange={() =>
      //   scrollRef.current?.scrollToEnd({ animated: false })
      // }
      contentContainerStyle={{
        flexGrow: 1,
        marginTop: 8,
        paddingBottom: 16,
        paddingHorizontal: 8,
        gap: 16,
        width: "100%",
        alignItems: "flex-end",
      }}
    ></FlatList>
  );
}
