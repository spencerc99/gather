import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { StyledInput, StyledButton, StyledText } from "./Themed";
import { UserContext } from "../utils/user";
import { XStack, YStack } from "tamagui";

export function RapidCreateCollection() {
  const { createCollection } = useContext(DatabaseContext);
  const [createdCollectionNames, setCreatedCollectionNames] = useState<
    Set<string>
  >(new Set());
  const [collectionName, setCollectionName] = useState("");
  const { currentUser } = useContext(UserContext);

  const handleCreateCollection = async () => {
    if (collectionName && !createdCollectionNames.has(collectionName)) {
      await createCollection({
        title: collectionName,
        createdBy: currentUser!.id,
      });
      setCreatedCollectionNames((prev) => new Set(prev).add(collectionName));
      setCollectionName("");
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <YStack space="$2">
      <XStack alignItems="center" gap="$1.5">
        <StyledInput
          flex={1}
          value={collectionName}
          onChangeText={setCollectionName}
          placeholder="Collection name..."
          onSubmitEditing={async () => {
            await handleCreateCollection();
          }}
          returnKeyType="send"
          returnKeyLabel="create"
        />
        <StyledButton
          onPress={handleCreateCollection}
          disabled={
            !collectionName || createdCollectionNames.has(collectionName)
          }
        >
          <StyledText>Create</StyledText>
        </StyledButton>
      </XStack>
      {createdCollectionNames.size > 0 && (
        <>
          <StyledText>
            <StyledText metadata>(created)</StyledText>{" "}
            {Array.from(createdCollectionNames).join(", ")}
          </StyledText>
        </>
      )}
    </YStack>
  );
}
