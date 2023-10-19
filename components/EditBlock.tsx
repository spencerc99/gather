import { ScrollView, SizableText, View, YStack } from "tamagui";
import { StyledButton, StyledInput, StyledTextArea } from "./Themed";
import { KeyboardAvoidingView, Platform } from "react-native";
import { BlockContent } from "./BlockContent";
import { useContext, useState } from "react";
import { Block, DatabaseContext } from "../utils/db";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SelectConnectionsList } from "./SelectConnectionsList";

export function EditBlock({ block }: { block: Block }) {
  const { id, content, type, source, title, createdAt } = block;
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");

  function onEditBlock() {
    // TODO: update block with changes
  }

  const insets = useSafeAreaInsets();
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  return (
    <>
      <ScrollView
        flex={1}
        contentContainerStyle={{
          flexShrink: 1,
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
              <BlockContent {...block} />
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
            <SelectConnectionsList
              selectedCollections={selectedCollections}
              setSelectedCollections={setSelectedCollections}
            />
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
