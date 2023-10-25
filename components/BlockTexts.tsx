import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { XStack, YStack, useTheme } from "tamagui";
import { Icon, StyledButton, StyledParagraph } from "./Themed";
import { BlockSummary, BlockTextSummary } from "./BlockSummary";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Keyboard, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export function BlockTexts({ collectionId }: { collectionId?: string }) {
  const { localBlocks: allBlocks, getCollectionItems } =
    useContext(DatabaseContext);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void fetchBlocks();

    const listener = Keyboard.addListener("keyboardWillShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => listener.remove();
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
      [...blocks].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
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
        <BlockTextSummary block={block} />
      </Swipeable>
    );
  }

  return (
    <ScrollView
      style={{
        overflowY: "visible",
      }}
      onScroll={() => {
        // Keyboard.dismiss();
      }}
      scrollEventThrottle={60}
      ref={scrollRef}
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: false })
      }
    >
      <YStack
        paddingBottom="$4"
        paddingHorizontal="$2"
        space="$4"
        width="100%"
        flexGrow={1}
        marginTop="$2"
        alignItems="flex-end"
      >
        {sortedBlocks.map(renderBlock)}
      </YStack>
    </ScrollView>
  );
}
