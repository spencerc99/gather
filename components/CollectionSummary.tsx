import { StyleSheet } from "react-native";
import { Collection } from "../utils/dataTypes";
import { AspectRatioImage, StyledParagraph, StyledView } from "./Themed";
import { GetProps, SizableText, XStack, YStack, useTheme } from "tamagui";
import { getRelativeDate } from "../utils/date";
import { RemoteSourceLabel } from "./RemoteSourceLabel";

export function CollectionSummary({
  collection,
  viewProps = {},
  titleProps,
  extraMetadata,
}: {
  collection: Collection;
  viewProps?: GetProps<typeof StyledView>;
  titleProps?: GetProps<typeof StyledParagraph>;
  extraMetadata?: React.ReactNode;
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
      paddingVertical="$4"
      width="100%"
      paddingHorizontal="$3"
      borderRadius={16}
      borderColor={theme.color?.get()}
      backgroundColor={theme.background?.get()}
      space="$3"
      {...viewProps}
    >
      {/* TODO: this doesnt work with long overflowing titles im gonna kms */}
      <YStack flexGrow={1} flex={1}>
        <XStack overflow="hidden" flex={1}>
          <StyledParagraph
            title
            flex={1}
            flexGrow={1}
            ellipse
            whiteSpace="nowrap"
            {...(Boolean(remoteSourceType)
              ? {
                  paddingRight: "$3",
                }
              : {})}
            {...(titleProps || {})}
          >
            {title}
          </StyledParagraph>
          <RemoteSourceLabel remoteSourceType={remoteSourceType} />
        </XStack>
        <StyledView style={styles.metaContainer}>
          <XStack gap="$1.5" alignItems="center">
            {extraMetadata}
            <StyledParagraph metadata>{numItems} items</StyledParagraph>
          </XStack>
          <StyledParagraph style={styles.floatRight} metadata>
            {getRelativeDate(lastConnectedAt || updatedAt)}
          </StyledParagraph>
        </StyledView>
      </YStack>
      <YStack width={40} height={40}>
        <AspectRatioImage
          uri={thumbnail}
          otherProps={{
            aspectRatio: 1,
            resizeMode: "cover",
            borderRadius: "$2",
            height: 40,
            width: 40,
          }}
        />
      </YStack>
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
      backgroundColor={theme.background?.get()}
      width={102}
      // TODO: literally have no idea why this is needed. Otherwise it grows BEYOND ITS CONTAINER to become like 400px. what the fuck
      // i hate react native so much.
      height={145}
      borderWidth={2}
      borderColor="transparent"
      {...viewProps}
      paddingBottom="$1"
      overflow="hidden"
    >
      <AspectRatioImage
        uri={thumbnail}
        otherProps={{
          aspectRatio: 1,
          resizeMode: "cover",
          borderRadius: "$2",
          // account for the border lmfao this is insane code.
          width: 98,
          height: 98,
        }}
      />
      <SizableText numberOfLines={2} paddingHorizontal="$1.5" size="$3">
        {title}
      </SizableText>
      {/* <StyledParagraph metadata>{numBlocks}</StyledParagraph> */}
    </YStack>
  );
}
