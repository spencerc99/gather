import { StyleSheet } from "react-native";
import { Collection } from "../utils/dataTypes";
import {
  AspectRatioImage,
  StyledLabel,
  StyledParagraph,
  StyledView,
} from "./Themed";
import { GetProps, SizableText, XStack, YStack, useTheme } from "tamagui";
import { getRelativeDate } from "../utils/date";

export function CollectionSummary({
  collection,
  viewProps = {},
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
}) {
  const {
    title,
    updatedAt,
    createdBy,
    numBlocks: numItems,
    lastConnectedAt,
    thumbnail,
    remoteSourceType,
  } = collection;
  const theme = useTheme();

  return (
    <XStack
      paddingVertical={16}
      width="100%"
      paddingHorizontal={12}
      borderWidth={2}
      borderColor={theme.color.get()}
      backgroundColor={theme.background.get()}
      space="$3"
      {...viewProps}
    >
      <YStack flexGrow={1}>
        <XStack justifyContent="space-between">
          <StyledParagraph title>{title}</StyledParagraph>
          {remoteSourceType && (
            <XStack
              alignSelf="flex-end"
              borderWidth={1}
              paddingHorizontal="$1"
              borderRadius="$3"
              borderColor={theme.color.get()}
            >
              <StyledLabel>{remoteSourceType}</StyledLabel>
            </XStack>
          )}
        </XStack>
        <StyledView style={styles.metaContainer}>
          <StyledParagraph metadata>
            {/* {createdBy} | {numItems} items */}
            {numItems} items
          </StyledParagraph>
          <StyledParagraph style={styles.floatRight} metadata>
            {getRelativeDate(lastConnectedAt || updatedAt)}
          </StyledParagraph>
        </StyledView>
      </YStack>
      <AspectRatioImage
        uri={thumbnail}
        otherProps={{
          aspectRatio: 1,
          resizeMode: "cover",
          borderRadius: 8,
          height: 40,
          width: 40,
        }}
      />
    </XStack>
  );
}

export const styles = StyleSheet.create({
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
      space="$2"
      borderRadius={8}
      backgroundColor={theme.background.get()}
      width={100}
      // TODO: literally have no idea why this is needed. Otherwise it grows BEYOND ITS CONTAINER to become like 400px. what the fuck
      // i hate react native so much.
      height={140}
      {...viewProps}
      paddingBottom="$1"
      overflow="hidden"
    >
      <AspectRatioImage
        uri={thumbnail}
        otherProps={{
          aspectRatio: 1,
          resizeMode: "cover",
          borderRadius: 8,
          // account for the border lmfao this is insane code.
          maxWidth: 100,
          maxHeight: 100,
        }}
      />
      <SizableText numberOfLines={2} paddingHorizontal="$1.5" size="$3">
        {title}
      </SizableText>
      {/* <StyledParagraph metadata>{numBlocks}</StyledParagraph> */}
    </YStack>
  );
}
