import { StyleSheet } from "react-native";
import { Collection } from "../utils/dataTypes";
import { AspectRatioImage, StyledParagraph, StyledView } from "./Themed";
import { GetProps, YStack, useTheme } from "tamagui";

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

export function CollectionThumbnail({
  collection,
  viewProps = {},
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
}) {
  const { title, thumbnail, numBlocks } = collection;
  const theme = useTheme();

  return (
    <YStack
      flex={1}
      space="$1"
      borderRadius={8}
      backgroundColor={theme.background.get()}
      {...viewProps}
      width={100}
      maxHeight={140}
    >
      <AspectRatioImage
        uri={thumbnail}
        otherProps={{
          aspectRatio: 1,
          resizeMode: "cover",
          borderRadius: 4,
          maxWidth: 100,
          maxHeight: 100,
        }}
      />
      <StyledParagraph numberOfLines={2} paddingHorizontal="$1">
        {title}
      </StyledParagraph>
      {/* <StyledParagraph metadata>{numBlocks}</StyledParagraph> */}
    </YStack>
  );
}
