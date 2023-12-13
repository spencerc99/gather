import { useContext, useState } from "react";
import { Spinner, YStackProps } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { SelectArenaChannel } from "../views/ArenaLogin";
import { StyledButton } from "./Themed";
import { Keyboard } from "react-native";

export function ImportArenaChannelSelect({
  isLoading,
  setIsLoading,
  onSuccess,
  frameProps,
  overlayProps,
  modal = true,
}: {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  onSuccess?: () => void;
  frameProps?: YStackProps;
  overlayProps?: YStackProps;
  modal?: boolean;
}) {
  const { tryImportArenaChannel, fetchCollections } =
    useContext(DatabaseContext);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [arenaChannel, setArenaChannel] = useState<string>("");

  async function onImportChannel() {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      await tryImportArenaChannel(
        arenaChannel,
        selectedCollection || undefined
      );
      setArenaChannel("");
      // TODO: this should not be needed because `createCollection` calls it
      // but for some reason not showing up.. maybe a read-replica thing?
      fetchCollections();
      // TODO: add toast saying success with new collection name and how many blocks created
      onSuccess?.();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* TODO: maybe just have it import on click? */}
      <SelectArenaChannel
        setArenaChannel={setArenaChannel}
        arenaChannel={arenaChannel}
        frameProps={frameProps}
        overlayProps={overlayProps}
        modal={modal}
      />
      <StyledButton
        onPress={async () => {
          await onImportChannel();
          alert(
            'Imported channel "' +
              arenaChannel +
              '" from are.na. Adding items to it will sync to are.na, but new items added to are.na will not sync here (coming soon).'
          );
        }}
        disabled={isLoading || !arenaChannel}
        icon={isLoading ? <Spinner size="small" /> : null}
      >
        Import Channel
      </StyledButton>
    </>
  );
}
