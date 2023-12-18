import { XStack, useTheme } from "tamagui";
import { Connection } from "../utils/dataTypes";
import { StyledParagraph, StyledView } from "./Themed";
import { styles } from "./CollectionSummary";
import { getRelativeDate } from "../utils/date";
import { RemoteSourceLabel } from "./RemoteSourceLabel";

export function ConnectionSummary({ connection }: { connection: Connection }) {
  const theme = useTheme();
  const { createdBy, createdTimestamp, collectionTitle, remoteSourceType } =
    connection;

  return (
    <StyledView
      display="flex"
      flexDirection="column"
      paddingVertical={16}
      paddingHorizontal={12}
      borderWidth={1}
      width="100%"
      borderColor={theme.color.get()}
      backgroundColor={theme.background.get()}
    >
      <XStack>
        <StyledParagraph
          title
          {...(Boolean(remoteSourceType)
            ? {
                paddingRight: "$2",
              }
            : {})}
          // TODO: this doesnt work idk why
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
          connected {getRelativeDate(createdTimestamp)}
        </StyledParagraph>
      </StyledView>
    </StyledView>
  );
}
