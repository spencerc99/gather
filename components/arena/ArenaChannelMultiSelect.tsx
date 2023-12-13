import { useContext, useState, useEffect, useMemo } from "react";
import { useDebounceValue, YStack, ScrollView, Stack, Sheet } from "tamagui";
import { ArenaChannelInfo, getUserChannels } from "../../utils/arena";
import { RemoteSourceType } from "../../utils/dataTypes";
import { DatabaseContext } from "../../utils/db";
import { filterItemsBySearchValue } from "../../utils/search";
import { InputWithIcon, StyledButton } from "../Themed";
import { ArenaChannelSummary } from "./ArenaChannelSummary";

export function ArenaChannelMultiSelect({
  selectedChannels,
  setSelectedChannels,
}: {
  selectedChannels: ArenaChannelInfo[];
  setSelectedChannels: (selectedChannels: ArenaChannelInfo[]) => void;
}) {
  const { arenaAccessToken, collections } = useContext(DatabaseContext);
  const [channels, setChannels] = useState<ArenaChannelInfo[] | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (arenaAccessToken) {
      void getUserChannels(arenaAccessToken).then((channels) => {
        setChannels(channels);
      });
    } else {
      setChannels([]);
    }
  }, [arenaAccessToken]);

  const filteredChannels = useMemo(
    () => filterItemsBySearchValue(channels || [], debouncedSearch, ["title"]),
    [channels, debouncedSearch]
  );

  const selectedChannelIds = selectedChannels.map((c) => c.id.toString());

  if (!arenaAccessToken) {
    return null;
  }

  return (
    <Stack>
      <StyledButton backgroundColor="white" onPress={() => setOpen(true)}>
        {!channels ? "Loading from are.na..." : "Select channels to import"}
      </StyledButton>

      <Sheet
        forceRemoveScrollEnabled={open}
        open={open}
        modal
        onOpenChange={setOpen}
        dismissOnSnapToBottom
        animation="quick"
      >
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle />
        <Sheet.Frame padding="$1" space="$2">
          <YStack margin="$2">
            <InputWithIcon
              icon="search"
              placeholder="Search..."
              backgroundColor="$gray4"
              value={searchValue}
              onChangeText={(text) => setSearchValue(text)}
            />
          </YStack>
          <ScrollView
            contentContainerStyle={{
              // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
              paddingBottom: 24,
            }}
          >
            {filteredChannels?.map((channel, idx) => {
              const isDisabled = collections.some(
                (c) =>
                  c.remoteSourceType === RemoteSourceType.Arena &&
                  c.remoteSourceInfo?.arenaId === channel.id.toString()
              );
              const isSelected = selectedChannelIds.includes(
                channel.id.toString()
              );

              return (
                <>
                  <Stack
                    disabled={isDisabled}
                    key={channel.id}
                    backgroundColor={isSelected ? "$green4" : undefined}
                    opacity={isDisabled ? 0.5 : undefined}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedChannels(
                          selectedChannels.filter(
                            (c) => c.id.toString() !== channel.id.toString()
                          )
                        );
                      } else {
                        setSelectedChannels([...selectedChannels, channel]);
                      }
                    }}
                  >
                    <ArenaChannelSummary
                      channel={channel}
                      isDisabled={isDisabled}
                    />
                  </Stack>
                </>
              );
            })}
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
    </Stack>
  );
}
