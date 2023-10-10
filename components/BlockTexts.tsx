import { useContext, useEffect, useMemo, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { XStack, YStack, useTheme } from "tamagui";
import { StyledParagraph } from "./Themed";
import { BlockSummary } from "./BlockSummary";
import { getRelativeDate } from "../utils/date";

export function BlockTexts() {
  const { db, blocks } = useContext(DatabaseContext);
  const sortedBlocks = useMemo(
    () => blocks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [blocks]
  );
  const theme = useTheme();

  function renderBlock(block: Block) {
    return (
      <YStack
        key={block.createdAt.getTime()}
        borderWidth={1}
        borderRadius={4}
        borderColor={theme.color.get()}
        backgroundColor={theme.background.get()}
        space="$2"
        padding="$3"
        style={{
          width: "auto",
        }}
      >
        <XStack justifyContent="flex-end">
          <BlockSummary
            block={block}
            style={{
              borderWidth: 0,
              backgroundColor: "inherit",
            }}
          />
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack paddingBottom="$4" space="$4" width="100%">
      {sortedBlocks.map(renderBlock)}
    </YStack>
  );
}
