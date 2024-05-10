import { memo, useCallback, useContext, useMemo, useState } from "react";
import { FlatList, Pressable } from "react-native";
import {
  ScrollView,
  SizableText,
  Spinner,
  Stack,
  XStack,
  YStack,
} from "tamagui";
import { Collection } from "../utils/dataTypes";
import { DatabaseContext, useCollections } from "../utils/db";
import { UserContext } from "../utils/user";
import { CollectionSummary, CollectionThumbnail } from "./CollectionSummary";
import { Icon, LinkButton, SearchBarInput, StyledButton } from "./Themed";

const SelectCollectionView = memo(
  ({
    collection,
    toggleCollection,
    horizontal,
    viewProps,
  }: {
    collection: Collection;
    toggleCollection: (collection: Collection) => void;
    horizontal?: boolean;
    viewProps?: object;
  }) => (
    <Pressable key={collection.id} onPress={() => toggleCollection(collection)}>
      {/* TODO: bold the matching parts */}
      {horizontal ? (
        <CollectionThumbnail collection={collection} viewProps={viewProps} />
      ) : (
        <CollectionSummary collection={collection} viewProps={viewProps} />
      )}
    </Pressable>
  )
);

export function SelectCollectionsList({
  selectedCollections: selectedCollections,
  setSelectedCollections: setSelectedCollections,
  scrollContainerPaddingBottom,
  horizontal,
  searchValue: propSearch,
  setSearchValue: propSetSearchValue,
  extraSearchContent,
}: {
  selectedCollections: string[];
  setSelectedCollections: (selectedCollections: string[]) => void;
  scrollContainerPaddingBottom?: number;
  horizontal?: boolean;
  searchValue?: string;
  setSearchValue?: (newSearch: string) => void;
  extraSearchContent?: React.ReactNode;
}) {
  const { createCollection } = useContext(DatabaseContext);
  const [internalSearchValue, internalSetSearchValue] = useState("");
  const { currentUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const createdCollections = useMemo(() => new Set<string>(), []);
  // const debouncedFetchMoreCollections = useDebounce(fetchMoreCollections, 300);

  // const { data, error, isFetchingNextPage, fetchNextPage, hasNextPage } =
  //   useInfiniteQuery({
  //     queryKey: ["collections"],
  //     queryFn: async ({ pageParam, queryKey }) => {
  //       const collections = await getCollections({ page: pageParam });

  //       return {
  //         collections,
  //         nextId: pageParam + 1,
  //         previousId: pageParam === 0 ? undefined : pageParam - 1,
  //       };
  //     },
  //     initialPageParam: 0,
  //     getPreviousPageParam: (firstPage) => firstPage.previousId ?? undefined,
  //     getNextPageParam: (lastPage) => lastPage.nextId ?? undefined,
  //   });
  // const collections = data?.pages.flatMap((p) => p.collections);

  const searchValue = useMemo(
    () => (propSetSearchValue && propSearch ? propSearch : internalSearchValue),
    [propSearch, internalSearchValue]
  );
  const setSearchValue = useCallback(
    (newSearch: string) => {
      if (propSetSearchValue) {
        propSetSearchValue(newSearch);
      } else {
        internalSetSearchValue(newSearch);
      }
    },
    [propSetSearchValue, internalSetSearchValue]
  );

  const { collections, isLoading } = useCollections(searchValue);

  const sortedCollections = useMemo(() => {
    // sort selected collections to top
    if (!collections) {
      return;
    }

    if (searchValue) {
      return collections;
    }

    return collections.sort((a, b) => {
      if (
        selectedCollections.includes(a.id) &&
        !selectedCollections.includes(b.id)
      ) {
        return -1;
      }
      if (
        selectedCollections.includes(b.id) &&
        !selectedCollections.includes(a.id)
      ) {
        return 1;
      }
      return 0;
    });
  }, [collections, selectedCollections]);

  const toggleCollection = useCallback(
    (collection: Collection) => {
      if (selectedCollections.includes(collection.id)) {
        setSelectedCollections(
          selectedCollections.filter((id) => id !== collection.id)
        );
      } else {
        setSelectedCollections([...selectedCollections, collection.id]);
      }
    },
    [selectedCollections, setSelectedCollections]
  );

  async function onClickCreateCollection() {
    if (!currentUser) {
      return;
    }
    /* TODO: after creation, pop toast that it was created, clear search and push to top of collections list? */
    const newCollectionId = await createCollection({
      title: searchValue,
      createdBy: currentUser.id,
    });
    setSelectedCollections([...selectedCollections, newCollectionId]);
  }

  const renderCollection = useCallback(
    ({ item: collection }: { item: Collection }) => {
      const viewProps = selectedCollections.includes(collection.id)
        ? {
            backgroundColor: "$green4",
            borderColor: "$green10",
          }
        : undefined;

      return (
        <SelectCollectionView
          collection={collection}
          toggleCollection={toggleCollection}
          horizontal={horizontal}
          viewProps={viewProps}
        />
      );
    },
    [selectedCollections]
  );

  function renderCollections() {
    if (isLoading) {
      return <Spinner color="$orange9" size="small" />;
    }
    return (
      <FlatList
        scrollEnabled={false}
        horizontal={Boolean(horizontal)}
        keyboardShouldPersistTaps={"handled"}
        data={sortedCollections}
        contentContainerStyle={{
          gap: horizontal ? 8 : 4,
        }}
        renderItem={renderCollection}
      />
    );
  }

  function renderCollectionsList() {
    return (
      <Stack
        {...(horizontal
          ? {
              paddingRight: scrollContainerPaddingBottom,
            }
          : { paddingBottom: scrollContainerPaddingBottom })}
      >
        {horizontal ? (
          <ScrollView horizontal>
            <XStack
              space="$2"
              alignItems="center"
              paddingVertical="$2"
              // TODO: figure this out
              onPress={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {!searchValue && collections?.length === 0 && (
                <YStack height={140} width={110} justifyContent="center">
                  <LinkButton
                    href="/modal"
                    icon={<Icon name="add-circle" />}
                    height="auto"
                    minHeight={40}
                    paddingVertical="$1"
                  >
                    <SizableText
                      userSelect="none"
                      cursor="pointer"
                      color="$color"
                      size="$true"
                    >
                      <SizableText>New collection</SizableText>
                    </SizableText>
                  </LinkButton>
                </YStack>
              )}
              {searchValue && !createdCollections.has(searchValue) && (
                // Matches the height of CollectionThumbnail lol
                <YStack height={140} width={100} justifyContent="center">
                  <StyledButton
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await onClickCreateCollection();
                        createdCollections.add(searchValue);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    icon={
                      loading ? (
                        <Spinner size="small" />
                      ) : (
                        <Icon name="add-circle" />
                      )
                    }
                    height="auto"
                    minHeight={40}
                    disabled={loading}
                  >
                    <SizableText
                      userSelect="none"
                      cursor="pointer"
                      color="$color"
                      size="$true"
                      style={{ fontWeight: 700 }}
                    >
                      <SizableText>{searchValue}</SizableText>
                    </SizableText>
                  </StyledButton>
                </YStack>
              )}
              {renderCollections()}
            </XStack>
          </ScrollView>
        ) : (
          <ScrollView>
            <YStack space="$1">
              {searchValue && (
                <StyledButton
                  onPress={async () => {
                    await onClickCreateCollection();
                  }}
                  noTextWrap={true}
                  height="auto"
                  paddingVertical={16}
                >
                  <SizableText
                    userSelect="none"
                    cursor="pointer"
                    color="$color"
                    size="$true"
                  >
                    New collection{" "}
                    <SizableText style={{ fontWeight: 700 }}>
                      {searchValue}
                    </SizableText>
                  </SizableText>
                </StyledButton>
              )}
              {renderCollections()}
            </YStack>
          </ScrollView>
        )}
      </Stack>
    );
  }

  return (
    <Stack flexDirection={"column"}>
      <XStack
        gap="$1"
        padding="$1"
        marginBottom={horizontal ? undefined : "$2"}
      >
        <SearchBarInput
          containerProps={{
            flex: 1,
          }}
          backgroundColor="$gray4"
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          placeholder="Search a collection..."
        />
        {extraSearchContent}
      </XStack>
      {renderCollectionsList()}
    </Stack>
  );
}
