import { useState } from "react";
import { FlatList, Keyboard } from "react-native";
import { Spinner, YStack } from "tamagui";
import { BlockSummary } from "../components/BlockSummary";
import { SearchBarInput, StyledText } from "../components/Themed";
import { useBlockSearch } from "../utils/db";

export function SearchView() {
  const [searchValue, setSearchValue] = useState("");
  const { blocks, isLoading, fetchMore, isFetchingNextPage, hasSearch } =
    useBlockSearch(searchValue);

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack padding="$3" paddingBottom="$2">
        <SearchBarInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          autoFocus
          placeholder="Search your blocks..."
        />
      </YStack>

      {!hasSearch ? (
        <YStack
          flex={1}
          alignItems="center"
          paddingTop="$8"
          paddingHorizontal="$4"
        >
          <StyledText metadata textAlign="center">
            Search across your blocks by title, description, or text.
          </StyledText>
        </YStack>
      ) : isLoading ? (
        <YStack flex={1} alignItems="center" paddingTop="$8">
          <Spinner color="$orange9" size="large" />
        </YStack>
      ) : blocks && blocks.length === 0 ? (
        <YStack flex={1} alignItems="center" paddingTop="$8">
          <StyledText metadata>No results found.</StyledText>
        </YStack>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 40,
            gap: 16,
          }}
          onEndReached={fetchMore}
          onEndReachedThreshold={1}
          renderItem={({ item }) => (
            <BlockSummary
              block={item}
              shouldLink
              hideHoldMenu
              containerProps={{ width: "100%" }}
              blockStyle={{ resizeMode: "cover", maxHeight: 240 }}
            />
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <YStack paddingVertical="$3" alignItems="center">
                <Spinner color="$orange9" />
              </YStack>
            ) : null
          }
        />
      )}
    </YStack>
  );
}
