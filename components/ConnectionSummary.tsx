import { XStack, useTheme } from "tamagui";
import { Connection } from "../utils/dataTypes";
import { StyledParagraph, StyledView } from "./Themed";
import { styles } from "./CollectionSummary";
import { getRelativeDate } from "../utils/date";
import { RemoteSourceLabel } from "./RemoteSourceLabel";
import { useTime } from "../hooks/useTime";
import { useMemo } from "react";

export function ConnectionSummary({ connection }: { connection: Connection }) {
  const theme = useTheme();
  const {
    createdBy,
    createdTimestamp,
    collectionTitle,
    remoteSourceType,
    remoteCreatedAt,
  } = connection;

  const time = useTime(60 * 1000);
  const connectedAt = useMemo(
    () => getRelativeDate(remoteCreatedAt || createdTimestamp),
    [time, remoteCreatedAt, createdTimestamp]
  );

  return (
    <StyledView
      paddingVertical="$4"
      width="100%"
      paddingHorizontal="$3"
      borderRadius={16}
      borderColor={theme.color?.get()}
      backgroundColor={theme.background?.get()}
    >
      <XStack>
        <StyledParagraph
          title
          {...(Boolean(remoteSourceType)
            ? {
                paddingRight: "$2",
              }
            : {})}
          wordWrap="break-word"
          flexGrow={1}
        >
          {collectionTitle}
        </StyledParagraph>
        <RemoteSourceLabel remoteSourceType={remoteSourceType} />
      </XStack>
      <StyledView style={styles.metaContainer}>
        {/* <StyledParagraph metadata>{createdBy}</StyledParagraph> */}
        <StyledParagraph alignSelf="flex-end" metadata>
          connected {connectedAt}
        </StyledParagraph>
      </StyledView>
    </StyledView>
  );
}
