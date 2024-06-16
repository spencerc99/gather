import { SafeAreaView } from "react-native-safe-area-context";
import { BlockTexts } from "../components/BlockTexts";
import { useArenaChannelBlocks } from "../utils/hooks/useArenaChannelBlocks";
import { useMemo } from "react";
import { rawArenaBlockToBlock } from "../utils/arena";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";

const ArenaChangelogChannel = "gather-changelog";

export default function Changelog() {
  const { data, isLoading, isFetchingNextPage, fetchMore } =
    useArenaChannelBlocks(ArenaChangelogChannel);
  useFixExpoRouter3NavigationTitle();

  const blocks = useMemo(
    () => data?.pages.flatMap((p) => p.contents)?.map(rawArenaBlockToBlock),
    [data]
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingBottom: "10%",
      }}
    >
      <BlockTexts
        fetchMoreBlocks={fetchMore}
        blocks={blocks || null}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
      />
    </SafeAreaView>
  );
}
