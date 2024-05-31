import { XStack, useTheme } from "tamagui";
import { RemoteSourceType } from "../utils/dataTypes";
import { ensureUnreachable } from "../utils/react";
import { ArenaLogo } from "./Themed";

export function RemoteSourceLabel({
  remoteSourceType,
}: {
  remoteSourceType: RemoteSourceType | undefined;
}) {
  const theme = useTheme();

  if (!remoteSourceType) return null;

  function renderRemoteSourceLabel() {
    if (!remoteSourceType) return null;

    switch (remoteSourceType) {
      case RemoteSourceType.Arena:
        return <ArenaLogo />;
      default:
        return ensureUnreachable(remoteSourceType);
    }
  }
  return (
    <XStack
      alignSelf="flex-end"
      borderWidth={0.5}
      paddingHorizontal="$1"
      borderRadius="$3"
      borderColor={theme.color?.get()}
    >
      {renderRemoteSourceLabel()}
    </XStack>
  );
}
