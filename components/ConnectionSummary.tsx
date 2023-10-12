import { useTheme } from "tamagui";
import { Connection } from "../utils/dataTypes";
import { StyledParagraph, StyledView } from "./Themed";
import { styles } from "./CollectionSummary";

export function ConnectionSummary({ connection }: { connection: Connection }) {
  const theme = useTheme();
  const { createdBy, createdTimestamp, collectionTitle } = connection;

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
      <StyledParagraph title>Connected to {collectionTitle}</StyledParagraph>
      <StyledView style={styles.metaContainer}>
        <StyledParagraph metadata>{createdBy}</StyledParagraph>
        <StyledParagraph alignSelf="flex-end" metadata>
          {createdTimestamp.toDateString()}
        </StyledParagraph>
      </StyledView>
    </StyledView>
  );
}
