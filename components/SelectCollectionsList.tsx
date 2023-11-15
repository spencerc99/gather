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
  InputWithIcon,
  LinkButton,
  StyledButton,
  StyledParagraph,
} from "./Themed";
import { CollectionSummary, CollectionThumbnail } from "./CollectionSummary";
import { Pressable } from "react-native";
import { currentUser } from "../utils/user";
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
    /* TODO: after creation, pop toast that it was created, clear search and push to top of collections list? */
    const newCollectionId = await createCollection({
      title: searchValue,
      createdBy: currentUser().id,
    });
    setSelectedCollections([...selectedCollections, newCollectionId]);
  }

  function renderCollections() {
    return filteredCollections.map((collection) => {
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
            <CollectionSummary collection={collection} viewProps={viewProps} />
          )}
        </Pressable>
      );
    });
  }

  function renderCollectionsList() {
    if (horizontal) {
      return (
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
      );
    } else {
      return (
        <YStack space="$1">
          {!searchValue && collections.length === 0 && (
            <YStack height={140} width={100} justifyContent="center">
              <LinkButton
                href="/modal"
                icon={<Icon name="plus" />}
                height="auto"
                minHeight={40}
              >
                New collection
              </LinkButton>
            </YStack>
          )}
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
      );
    }
  }

  return (
    // horizontal ? "column-reverse" :
    <Stack flexDirection={"column"} height="auto">
      <InputWithIcon
        icon="search"
        placeholder="Search a collection..."
        width="100%"
        backgroundColor="$gray4"
        value={searchValue}
        onChangeText={(text) => setSearchValue(text)}
      />
      <ScrollView
        contentContainerStyle={
          horizontal
            ? {
                paddingBottom: scrollContainerPaddingBottom,
              }
            : { paddingRight: scrollContainerPaddingBottom }
        }
        horizontal={horizontal}
        keyboardShouldPersistTaps={"handled"}
      >
        {renderCollectionsList()}
      </ScrollView>
    </Stack>
  );
}
