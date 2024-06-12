import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import { useDebounce, useDebounceValue } from "tamagui";
import { getUserChannels, searchChannels } from "../arena";
import { DatabaseContext } from "../db";
import { UserContext } from "../user";

export enum ChannelScope {
  User = "User",
  Open = "Open",
}

export function useArenaChannels(
  searchValue: string,
  channelScope: ChannelScope = ChannelScope.User
) {
  const { getArenaCollectionIds } = useContext(DatabaseContext);
  const debouncedSearch = useDebounceValue(searchValue, 300);

  const { data: remoteCollectionIds } = useQuery({
    queryKey: ["collections", "ids"],
    queryFn: async () => await getArenaCollectionIds(),
  });

  const {
    data: userChannels,
    isLoading: isLoadingUserChannels,
    isFetchingNextPage: isFetchingNextUserPage,
    fetchMore: fetchMoreUser,
  } = useArenaUserChannels(debouncedSearch);
  const {
    data: searchChannels,
    isLoading: isLoadingSearchChannels,
    isFetchingNextPage: isFetchingNextSearchPage,
    fetchMore: fetchMoreSearch,
  } = useSearchArenaChannels(debouncedSearch);

  const { data, isLoading, isFetchingNextPage, fetchMore } =
    channelScope === ChannelScope.User
      ? {
          data: userChannels,
          isLoading: isLoadingUserChannels,
          isFetchingNextPage: isFetchingNextUserPage,
          fetchMore: fetchMoreUser,
        }
      : {
          data: searchChannels,
          isLoading: isLoadingSearchChannels,
          isFetchingNextPage: isFetchingNextSearchPage,
          fetchMore: fetchMoreSearch,
        };

  const annotatedChannels = data?.pages
    .flatMap((p) => p.channels)
    .map((c) => ({
      ...c,
      isDisabled: Boolean(remoteCollectionIds?.has(c.id.toString())),
    }));

  const filteredChannels = useMemo(() => {
    const nonDisabledChannels = annotatedChannels?.filter((c) => !c.isDisabled);
    return debouncedSearch === "" ? nonDisabledChannels : annotatedChannels;
  }, [annotatedChannels, debouncedSearch, remoteCollectionIds]);

  return {
    channels: filteredChannels,
    isLoading,
    isFetchingNextPage,
    fetchMore,
  };
}

function useArenaUserChannels(debouncedSearch: string) {
  const { arenaAccessToken } = useContext(UserContext);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["channels", { search: debouncedSearch }],
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
          search: debouncedSearch,
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

  return {
    data,
    isLoading,
    isFetchingNextPage,
    fetchMore,
  };
}
// Only returns open channels
function useSearchArenaChannels(debouncedSearch: string) {
  const { arenaAccessToken } = useContext(UserContext);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["searchChannels", { search: debouncedSearch }],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        if (!arenaAccessToken) {
          return {
            channels: [],
            lastPage: undefined,
            nextPage: undefined,
          };
        }

        const resp = await searchChannels(arenaAccessToken, {
          page: pageParam,
          search: debouncedSearch,
        });

        return {
          ...resp,
          channels: resp.channels.filter((c) => c.status === "public"),
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

  return {
    data,
    isLoading,
    isFetchingNextPage,
    fetchMore,
  };
}
