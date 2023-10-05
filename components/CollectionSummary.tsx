import { StyleSheet } from "react-native";
import { Collection } from "../utils/dataTypes";
import { StyledText, StyledView } from "./Themed";
import { GetProps, useTheme } from "tamagui";

export function CollectionSummary({
  collection,
  viewProps = {},
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
}) {
  const { title, updatedAt, createdBy, numItems } = collection;
  const theme = useTheme();

  return (
    <StyledView
      style={styles.contentContainer}
      borderColor={theme.color.get()}
      {...viewProps}
    >
      <StyledText style={styles.title}>{title}</StyledText>
      <StyledView style={styles.metaContainer}>
        <StyledText>
          {createdBy} | {numItems} items
        </StyledText>
        <StyledText style={styles.floatRight}>
          {updatedAt.toDateString()}
        </StyledText>
      </StyledView>
    </StyledView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: "bold",
    fontSize: 18,
  },
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
