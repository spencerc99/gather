import { memo, useCallback, useContext, useMemo, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Collection } from "../utils/dataTypes";
import {
  ScrollView,
  SizableText,
  Spinner,
  Stack,
  View,
  XStack,
  YStack,
  useDebounceValue,
} from "tamagui";
import {
  Icon,
  LinkButton,
  SearchBarInput,
  StyledButton,
  StyledParagraph,
} from "./Themed";
import { CollectionSummary, CollectionThumbnail } from "./CollectionSummary";
import { FlatList, Pressable } from "react-native";
import { UserContext } from "../utils/user";
import { filterItemsBySearchValue } from "../utils/search";

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
  const { collections, createCollection } = useContext(DatabaseContext);
  const [internalSearchValue, internalSetSearchValue] = useState("");
  const { currentUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const createdCollections = useMemo(() => new Set<string>(), []);

  const searchValue = useMemo(
    () => (propSetSearchValue && propSearch ? propSearch : internalSearchValue),
    [propSearch, internalSearchValue]
  );
  const debouncedSearch = useDebounceValue(searchValue, 300);
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

  // sort by lastConnectedAt descending
  const sortedCollections = useMemo(
    () =>
      [...collections].sort(
        (a, b) =>
          (b.lastConnectedAt?.getTime() || b.updatedAt.getTime()) -
          (a.lastConnectedAt?.getTime() || a.updatedAt.getTime())
      ),
    [collections]
  );
  const filteredCollections = useMemo(
    () =>
      filterItemsBySearchValue(sortedCollections, debouncedSearch, [
        "title",
        "description",
      ]),
    [sortedCollections, debouncedSearch]
  );

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
    return (
      <FlatList
        scrollEnabled={false}
        horizontal={Boolean(horizontal)}
        keyboardShouldPersistTaps={"handled"}
        data={filteredCollections}
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
              {!searchValue && collections.length === 0 && (
                <YStack height={140} width={110} justifyContent="center">
                  <LinkButton
                    href="/modal"
                    icon={<Icon name="plus" />}
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
                      loading ? <Spinner size="small" /> : <Icon name="plus" />
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
