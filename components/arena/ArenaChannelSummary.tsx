import { GetProps, YStack } from "tamagui";
import { ArenaChannelInfo } from "../../utils/arena";
import { RemoteSourceType } from "../../utils/dataTypes";
import { mapSnakeCaseToCamelCaseProperties } from "../../utils/db";
import { CollectionSummary } from "../CollectionSummary";
import { StyledLabel, StyledView, UserAvatar } from "../Themed";
import { getCreatedByForRemote } from "../../utils/user";

export function ArenaChannelSummary({
  channel,
  isDisabled,
  viewProps,
}: {
  channel: ArenaChannelInfo;
  isDisabled?: boolean;
  viewProps?: GetProps<typeof StyledView>;
}) {
  let titleColor;
  switch (channel.status) {
    case "private":
      titleColor = "$red10";
      break;
    case "public":
      titleColor = "$green10";
      break;
    case "closed":
    default:
      break;
  }

  return (
    <>
      {isDisabled && (
        <YStack alignItems="center">
          <YStack
            position="absolute"
            paddingVertical="$0.5"
            paddingHorizontal="$2"
            backgroundColor="$gray8"
            borderRadius="$4"
          >
            {/* TODO: this is kinda jank */}
            <StyledLabel>Already imported!</StyledLabel>
          </YStack>
        </YStack>
      )}
      <CollectionSummary
        // TODO: extract this into a rawArenaChannelToCollection function
        collection={{
          ...mapSnakeCaseToCamelCaseProperties(channel),
          description: channel.metadata?.description || undefined,
          thumbnail: channel.contents?.find((c) => Boolean(c.image?.thumb.url))
            ?.image?.thumb.url,
          remoteSourceType: RemoteSourceType.Arena,
          numBlocks: channel.length,
          createdAt: new Date(channel.created_at),
          updatedAt: new Date(channel.updated_at),
          lastConnectedAt: new Date(channel.added_to_at),
          createdBy: getCreatedByForRemote(
            RemoteSourceType.Arena,
            channel.user.slug
          ),
          title: channel.title,
        }}
        viewProps={{
          borderWidth: 0,
          backgroundColor: "inherit",
          paddingHorizontal: "$3",
          paddingVertical: "$2",
          ...viewProps,
        }}
        titleProps={{
          color: titleColor,
        }}
        extraMetadata={
          <UserAvatar
            profilePic={channel.user.avatar_image.thumb}
            userId={channel.user.slug}
            size={16}
          />
        }
      />
    </>
  );
}
