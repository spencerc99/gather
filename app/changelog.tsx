import { SafeAreaView } from "react-native-safe-area-context";
import { BlockTexts } from "../components/BlockTexts";
import { useArenaChannelBlocks } from "../utils/hooks/useArenaChannelBlocks";
import { useMemo } from "react";
import { rawArenaBlockToBlock } from "../utils/arena";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";

const ArenaChangelogChannel = "2938095";

export default function Changelog() {
  const { data, isLoading, isFetchingNextPage, fetchMore } =
    useArenaChannelBlocks(ArenaChangelogChannel);
  useFixExpoRouter3NavigationTitle();

  const blocks = useMemo(
    () =>
      data?.pages
        .flatMap((p) => p.contents)
        ?.map(rawArenaBlockToBlock)
        .sort(
          (a, b) =>
            new Date(b.remoteConnectedAt || b.createdAt).getTime() -
            new Date(a.remoteConnectedAt || a.createdAt).getTime()
        ),
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
