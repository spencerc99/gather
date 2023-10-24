import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { Collection } from "../utils/dataTypes";
import { ScrollView, SizableText, YStack } from "tamagui";
import { InputWithIcon, StyledButton } from "./Themed";
import { CollectionSummary } from "./CollectionSummary";
import { Pressable } from "react-native";
import { currentUser } from "../utils/user";

export function SelectConnectionsList({
  selectedCollections: selectedCollections,
  setSelectedCollections: setSelectedCollections,
  scrollContainerPaddingBottom,
}: {
  selectedCollections: string[];
  setSelectedCollections: (selectedCollections: string[]) => void;
  scrollContainerPaddingBottom?: number;
}) {
  const { collections, createCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  // sort by lastConnectedAt descending
  const sortedCollections = [...collections].sort(
    (a, b) => b.lastConnectedAt?.getTime() - a.lastConnectedAt?.getTime() || 0
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

  return (
    <>
      <InputWithIcon
        icon="search"
        placeholder="Search..."
        width="100%"
        backgroundColor="$gray4"
        value={searchValue}
        onChangeText={(text) => setSearchValue(text)}
      />
      <ScrollView
        contentContainerStyle={{
          overflowY: "scroll",
          paddingBottom: scrollContainerPaddingBottom,
        }}
      >
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
      </ScrollView>
    </>
  );
}
