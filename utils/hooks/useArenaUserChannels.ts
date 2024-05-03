import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import { useDebounce, useDebounceValue } from "tamagui";
import { getUserChannels } from "../arena";
import { DatabaseContext } from "../db";
import { filterItemsBySearchValue } from "../search";

export function useArenaUserChannels(searchValue: string) {
  const { arenaAccessToken, getArenaCollectionIds } =
    useContext(DatabaseContext);
  const debouncedSearch = useDebounceValue(searchValue, 300);

  const { data: remoteCollectionIds } = useQuery({
    queryKey: ["collections", "ids"],
    queryFn: async () => await getArenaCollectionIds(),
  });

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["channels"],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        if (!arenaAccessToken) {
          return {
            channels: [],
            lastPage: undefined,
            nextPage: undefined,
          };
        }

        const resp = await getUserChannels(arenaAccessToken, {
          page: pageParam,
        });
        return {
          ...resp,
          lastPage: pageParam > 1 ? pageParam - 1 : undefined,
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
  const annotatedChannels = data?.pages
    .flatMap((p) => p.channels)
    .map((c) => ({
      ...c,
      isDisabled: Boolean(remoteCollectionIds?.has(c.id.toString())),
    }));

  // TODO: SEARCH
  // https://api.are.na/v2/search/user/15?filter%5Btype%5D=channels
  const filteredChannels = useMemo(() => {
    const nonDisabledChannels = annotatedChannels?.filter((c) => !c.isDisabled);
    return debouncedSearch === ""
      ? nonDisabledChannels
      : filterItemsBySearchValue(annotatedChannels || [], debouncedSearch, [
          "title",
        ]);
  }, [annotatedChannels, debouncedSearch, remoteCollectionIds]);

  return {
    channels: filteredChannels,
    isLoading,
    isFetchingNextPage,
    fetchMore,
  };
}
