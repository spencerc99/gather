import { StyleSheet } from "react-native";
import { Collection } from "../utils/dataTypes";
import { StyledParagraph, StyledView } from "./Themed";
import { GetProps, useTheme } from "tamagui";

export function CollectionSummary({
  collection,
  viewProps = {},
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
}) {
  const { title, updatedAt, createdBy, numBlocks: numItems } = collection;
  const theme = useTheme();

  return (
    <StyledView
      style={styles.contentContainer}
      borderColor={theme.color.get()}
      backgroundColor={theme.background.get()}
      {...viewProps}
    >
      <StyledParagraph title>{title}</StyledParagraph>
      <StyledView style={styles.metaContainer}>
        <StyledParagraph metadata>
          {createdBy} | {numItems} items
        </StyledParagraph>
        <StyledParagraph style={styles.floatRight} metadata>
          {updatedAt.toDateString()}
        </StyledParagraph>
      </StyledView>
    </StyledView>
  );
}

export const styles = StyleSheet.create({
  contentContainer: {
    display: "flex",
    flexDirection: "column",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    width: "100%",
  },
  metaContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  floatRight: {
    alignSelf: "flex-end",
  },
});
