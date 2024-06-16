import { useInfiniteQuery } from "@tanstack/react-query";
import { getChannelContentsPaginated } from "../arena";
import { useDebounce } from "tamagui";

export function useArenaChannelBlocks(channelId: string) {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["arenaBlocks", { channelId }],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        const contents = await getChannelContentsPaginated(channelId, {
          page: pageParam,
          per: 20,
        });

        return {
          contents: contents.filter(
            (c) => c.base_class === "Block" && c.class !== "Block"
          ),
          lastPage: pageParam > 1 ? pageParam - 1 : undefined,
          nextPage: contents.length < 20 ? pageParam + 1 : undefined,
        };
      },
      getPreviousPageParam: (firstPage) => firstPage.lastPage,
      getNextPageParam: (lastPage) => {
        return lastPage.nextPage;
      },
    });
  function tryFetchMore() {
    if (hasNextPage) {
      fetchNextPage();
    }
  }
  const fetchMore = useDebounce(tryFetchMore, 300);

  return {
    data,
    isLoading,
    isFetchingNextPage,
    fetchMore,
  };
}
