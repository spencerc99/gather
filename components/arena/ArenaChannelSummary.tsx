import { GetProps } from "tamagui";
import { ArenaChannelInfo } from "../../utils/arena";
import { RemoteSourceType } from "../../utils/dataTypes";
import { mapSnakeCaseToCamelCaseProperties } from "../../utils/db";
import { CollectionSummary } from "../CollectionSummary";
import { StyledView } from "../Themed";

export function ArenaChannelSummary({
  channel,
  isDisabled,
  viewProps,
}: {
  channel: ArenaChannelInfo;
  isDisabled?: boolean;
  viewProps?: GetProps<typeof StyledView>;
}) {
  return (
    <CollectionSummary
      collection={{
        ...mapSnakeCaseToCamelCaseProperties(channel),
        description: channel.metadata?.description || undefined,
        thumbnail: channel.contents?.find((c) => c.image?.thumb.url)?.image
          ?.thumb.url,
        remoteSourceType: RemoteSourceType.Arena,
        numBlocks: channel.length,
        createdAt: new Date(channel.created_at),
        updatedAt: new Date(channel.updated_at),
        lastConnectedAt: new Date(channel.added_to_at),
        createdBy: channel.user.slug,
        title: isDisabled ? `${channel.title} (imported)` : channel.title,
      }}
      viewProps={{
        borderWidth: 0,
        backgroundColor: "inherit",
        paddingHorizontal: "$3",
        paddingVertical: "$2",
        ...viewProps,
      }}
    />
  );
}
