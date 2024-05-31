import { useContext, useState } from "react";
import { Spinner, YStackProps } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { SelectArenaChannel } from "../views/ArenaLogin";
import { StyledButton } from "./Themed";
import { Keyboard } from "react-native";
import { ErrorsContext } from "../utils/errors";

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
  const { tryImportArenaChannel } = useContext(DatabaseContext);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [arenaChannel, setArenaChannel] = useState<string>("");
  const { logError } = useContext(ErrorsContext);

  async function onImportChannel() {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const { title, size } = await tryImportArenaChannel(
        arenaChannel,
        selectedCollection || undefined
      );
      setArenaChannel("");
      onSuccess?.();
      alert(
        'Imported channel "' +
          title +
          `" with ${size} blocks from are.na.\n\nItems added to and removed from this collection will push to Are.na, and items added to the are.na channel will sync back here, but removals on are.na will not take effect on Gather.`
      );
    } catch (error) {
      logError(error);
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
        }}
        disabled={isLoading || !arenaChannel}
        icon={isLoading ? <Spinner size="small" /> : null}
      >
        Import Channel
      </StyledButton>
    </>
  );
}
