import { useCallback, useContext, useMemo, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Collection } from "../utils/dataTypes";
import { ScrollView, SizableText, Stack, View, XStack, YStack } from "tamagui";
import { Icon, InputWithIcon, StyledButton, StyledParagraph } from "./Themed";
import { CollectionSummary, CollectionThumbnail } from "./CollectionSummary";
import { Pressable } from "react-native";
import { currentUser } from "../utils/user";

export function SelectConnectionsList({
  selectedCollections: selectedCollections,
  setSelectedCollections: setSelectedCollections,
  scrollContainerPaddingBottom,
  horizontal,
}: {
  selectedCollections: string[];
  setSelectedCollections: (selectedCollections: string[]) => void;
  scrollContainerPaddingBottom?: number;
  horizontal?: boolean;
}) {
  const { collections, createCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
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

  function toggleCollection(collection: Collection) {
    if (selectedCollections.includes(collection.id)) {
      setSelectedCollections(
        selectedCollections.filter((id) => id !== collection.id)
      );
    } else {
      setSelectedCollections([...selectedCollections, collection.id]);
    }
  }

  function renderCollections() {
    if (horizontal) {
      return (
        <XStack space="$2" alignItems="center" paddingVertical="$1">
          {/* TODO: after creation, pop toast that it was created, clear search and push to top of collections list? */}
          {searchValue && (
            <YStack>
              <StyledButton
                onPress={async () => {
                  const newCollectionId = await createCollection({
                    title: searchValue,
                    createdBy: currentUser().id,
                  });
                  setSelectedCollections([
                    ...selectedCollections,
                    newCollectionId,
                  ]);
                }}
                noTextWrap={true}
                icon={<Icon name="plus" />}
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
          {sortedCollections
            .filter((c) =>
              `${c.title}\n${c.description}}`
                .toLocaleLowerCase()
                .includes(searchValue.toLocaleLowerCase())
            )
            .map((collection) => (
              <Pressable
                key={collection.id}
                onPress={() => toggleCollection(collection)}
              >
                {/* TODO: bold the matching parts */}
                <CollectionThumbnail
                  collection={collection}
                  viewProps={
                    selectedCollections.includes(collection.id)
                      ? {
                          backgroundColor: "$green4",
                          borderWidth: 1,
                          borderColor: "$green10",
                        }
                      : undefined
                  }
                />
              </Pressable>
            ))}
        </XStack>
      );
    } else {
      return (
        <YStack space="$1">
          {/* TODO: after creation, pop toast that it was created, clear search and push to top of collections list? */}
          {searchValue && (
            <StyledButton
              onPress={async () => {
                const newCollectionId = await createCollection({
                  title: searchValue,
                  createdBy: currentUser().id,
                });

                setSelectedCollections([
                  ...selectedCollections,
                  newCollectionId,
                ]);
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
          {sortedCollections
            .filter((c) =>
              `${c.title}\n${c.description}}`
                .toLocaleLowerCase()
                .includes(searchValue.toLocaleLowerCase())
            )
            .map((collection) => (
              <Pressable
                key={collection.id}
                onPress={() => toggleCollection(collection)}
              >
                {/* TODO: bold the matching parts */}
                <CollectionSummary
                  collection={collection}
                  viewProps={
                    selectedCollections.includes(collection.id)
                      ? {
                          backgroundColor: "$green4",
                          borderWidth: 2,
                          borderColor: "$green10",
                        }
                      : undefined
                  }
                />
              </Pressable>
            ))}
        </YStack>
      );
    }
  }

  return (
    // horizontal ? "column-reverse" :
    <Stack flexDirection={"column"} height="auto">
      <InputWithIcon
        icon="search"
        placeholder="Search..."
        width="100%"
        backgroundColor="$gray4"
        value={searchValue}
        onChangeText={(text) => setSearchValue(text)}
      />
      <XStack flexGrow={1} height="100%">
        <ScrollView
          contentContainerStyle={
            horizontal
              ? {
                  paddingBottom: scrollContainerPaddingBottom,
                }
              : { paddingRight: scrollContainerPaddingBottom }
          }
          horizontal={horizontal}
        >
          {renderCollections()}
        </ScrollView>
      </XStack>
    </Stack>
  );
}
