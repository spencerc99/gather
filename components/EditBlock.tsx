import { ScrollView, SizableText, View, YStack } from "tamagui";
import {
  InputWithIcon,
  StyledButton,
  StyledInput,
  StyledTextArea,
} from "./Themed";
import { KeyboardAvoidingView, Pressable } from "react-native";
import { BlockContent } from "./BlockContent";
import { useContext, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { CollectionSummary } from "./CollectionSummary";
import { Collection } from "../utils/dataTypes";
import { currentUser } from "../utils/user";

export function EditBlock({ block }: { block: Block }) {
  const { collections, createCollection } = useContext(DatabaseContext);
  const { id, content, type, source, title, createdAt } = block;
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  function toggleCollection(collection: Collection) {
    if (selectedCollections.includes(collection.id)) {
      setSelectedCollections(
        selectedCollections.filter((id) => id !== collection.id)
      );
    } else {
      setSelectedCollections([...selectedCollections, collection.id]);
    }
  }

  function onEditBlock() {
    // TODO: update block with changes
  }
  return (
    <>
      <ScrollView
        flex={1}
        contentContainerStyle={{
          ...styles.parentContainer,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          // Account for header height https://stackoverflow.com/questions/48420468/keyboardavoidingview-not-working-properly
          keyboardVerticalOffset={insets.top}
          style={{
            flex: 1,
          }}
          contentContainerStyle={{
            flex: 1,
          }}
        >
          <YStack space="$2">
            {/* TODO: make this look beter */}
            <View maxWidth={"100%"} maxHeight={200}>
              <BlockContent content={content} type={type} />
            </View>
            <StyledInput
              placeholder="title"
              maxLength={120}
              onChangeText={(text) => setTitleValue(text)}
              value={titleValue}
            />
            <StyledTextArea
              placeholder="description"
              minHeight={undefined}
              maxLength={2000}
              onChangeText={(text) => setDescriptionValue(text)}
              value={descriptionValue}
            />
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
                // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
                paddingBottom: 164,
              }}
            >
              <YStack space="$1">
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
                {collections
                  .filter((c) =>
                    `${c.title}\n${c.description}}`.includes(`${searchValue}`)
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
          </YStack>
          {/* Render basket view and animate the item going into the collection? */}
        </KeyboardAvoidingView>
      </ScrollView>
      <StyledButton
        position="absolute"
        bottom={4}
        width="90%"
        left="5%"
        onPress={() => {
          onEditBlock();
        }}
      >
        Gather
      </StyledButton>
    </>
  );
}
