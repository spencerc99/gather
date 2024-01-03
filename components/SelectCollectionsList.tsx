import { useCallback, useContext, useMemo, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Collection } from "../utils/dataTypes";
import {
  ScrollView,
  SizableText,
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

export function SelectCollectionsList({
  selectedCollections: selectedCollections,
  setSelectedCollections: setSelectedCollections,
  scrollContainerPaddingBottom,
  horizontal,
  searchValue: propSearch,
  setSearchValue: propSetSearchValue,
}: {
  selectedCollections: string[];
  setSelectedCollections: (selectedCollections: string[]) => void;
  scrollContainerPaddingBottom?: number;
  horizontal?: boolean;
  searchValue?: string;
  setSearchValue?: (newSearch: string) => void;
}) {
  const { collections, createCollection } = useContext(DatabaseContext);
  const [internalSearchValue, internalSetSearchValue] = useState("");
  const { currentUser } = useContext(UserContext);

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

  function toggleCollection(collection: Collection) {
    if (selectedCollections.includes(collection.id)) {
      setSelectedCollections(
        selectedCollections.filter((id) => id !== collection.id)
      );
    } else {
      setSelectedCollections([...selectedCollections, collection.id]);
    }
  }

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

  function renderCollections() {
    return (
      <FlatList
        horizontal={Boolean(horizontal)}
        keyboardShouldPersistTaps={"handled"}
        data={filteredCollections}
        contentContainerStyle={{
          gap: horizontal ? 8 : 4,
        }}
        renderItem={({ item: collection }) => {
          const viewProps = selectedCollections.includes(collection.id)
            ? {
                backgroundColor: "$green4",
                borderWidth: 2,
                borderColor: "$green10",
              }
            : undefined;
          return (
            <Pressable
              key={collection.id}
              onPress={() => toggleCollection(collection)}
            >
              {/* TODO: bold the matching parts */}
              {horizontal ? (
                <CollectionThumbnail
                  collection={collection}
                  viewProps={viewProps}
                />
              ) : (
                <CollectionSummary
                  collection={collection}
                  viewProps={
                    viewProps || {
                      borderWidth: 1,
                    }
                  }
                />
              )}
            </Pressable>
          );
        }}
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
          <XStack
            space="$2"
            alignItems="center"
            paddingVertical="$3"
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
            {searchValue && (
              // Matches the height of CollectionThumbnail lol
              <YStack height={140} width={100} justifyContent="center">
                <StyledButton
                  onPress={async () => {
                    await onClickCreateCollection();
                  }}
                  icon={<Icon name="plus" />}
                  height="auto"
                  minHeight={40}
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
        ) : (
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
        )}
      </Stack>
    );
  }

  return (
    <Stack flexDirection={"column"}>
      <SearchBarInput
        backgroundColor="$gray4"
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        placeholder="Search a collection..."
        width="100%"
      />
      {renderCollectionsList()}
    </Stack>
  );
}
