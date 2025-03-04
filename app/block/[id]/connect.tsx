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
    return <Spinner size="large" color="$orange9" />;
  }

  async function onConnect() {
    if (!block) {
      return;
    }

    // TODO: turn this into try/catch and error toast if fails.
    replaceConnections(block.id, selectedCollections);
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
        <SelectCollectionsList
          selectedCollections={selectedCollections}
          setSelectedCollections={setSelectedCollections}
          scrollContainerPaddingBottom={150}
          extraSearchContent={
            <StyledButton
              onPress={onConnect}
              disabled={areArraysEqual(
                initialConnectedCollections,
                selectedCollections
              )}
            >
              Connect
            </StyledButton>
          }
        />
        {/* Use a light status bar on iOS to account for the black space above the modal */}
        <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      </StyledView>
    </>
  );
}
