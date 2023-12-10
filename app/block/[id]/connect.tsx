import { useContext, useEffect, useState } from "react";
import { Block, DatabaseContext } from "../../../utils/db";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Spinner } from "tamagui";
import { SelectCollectionsList } from "../../../components/SelectCollectionsList";
import { StyledButton, StyledView } from "../../../components/Themed";
import { areArraysEqual } from "../../../utils/common";

export default function BlockConnectModal() {
  const { id } = useLocalSearchParams();
  const [block, setBlock] = useState<Block | null>(null);
  const { getBlock, replaceConnections, getConnectionsForBlock } =
    useContext(DatabaseContext);
  const [initialConnectedCollections, setInitialConnectedCollections] =
    useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    getBlock(id.toString()).then((block) => setBlock(block));
    getConnectionsForBlock(id.toString()).then((connections) => {
      setSelectedCollections(
        connections.map((connection) => connection.collectionId)
      );
      setInitialConnectedCollections(
        connections.map((connection) => connection.collectionId)
      );
    });
  }, [id]);

  if (!block) {
    return <Spinner size="large" color="$orange4" />;
  }

  async function onConnect() {
    if (!block) {
      return;
    }

    await replaceConnections(block.id, selectedCollections);
    router.replace("..");
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Connect " + (block.title || "Block"),
        }}
      />
      <StyledView paddingHorizontal="$2" height="100%">
        <StyledButton
          onPress={onConnect}
          width="100%"
          marginTop="$3"
          marginBottom="$5"
          disabled={areArraysEqual(
            initialConnectedCollections,
            selectedCollections
          )}
        >
          Connect
        </StyledButton>
        <SelectCollectionsList
          selectedCollections={selectedCollections}
          setSelectedCollections={setSelectedCollections}
        />
      </StyledView>
    </>
  );
}
