import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../utils/db";
import { Block } from "../../../utils/dataTypes";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Spinner } from "tamagui";
import { SelectCollectionsList } from "../../../components/SelectCollectionsList";
import { StyledButton, StyledView } from "../../../components/Themed";
import { areArraysEqual } from "../../../utils/common";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

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
          position="absolute"
          bottom={40}
          zIndex={1}
          onPress={onConnect}
          width="100%"
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
          scrollContainerPaddingBottom={200}
        />
        <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      </StyledView>
    </>
  );
}
