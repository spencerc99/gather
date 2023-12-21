import { useContext, useState, useEffect, useMemo } from "react";
import { useDebounceValue, XStack, ScrollView, Stack, Sheet } from "tamagui";
import { ArenaChannelInfo, getUserChannels } from "../../utils/arena";
import { RemoteSourceType } from "../../utils/dataTypes";
import { DatabaseContext } from "../../utils/db";
import { filterItemsBySearchValue } from "../../utils/search";
import { SearchBarInput, StyledButton, StyledText } from "../Themed";
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
  const remoteCollectionIds = useMemo(
    () =>
      new Set(
        collections
          .filter(
            (c) =>
              c.remoteSourceType === RemoteSourceType.Arena &&
              c.remoteSourceInfo?.arenaId
          )
          .map((c) => c.remoteSourceInfo?.arenaId)
      ),
    [collections]
  );

  const nonDisabledChannels = useMemo(
    () =>
      channels?.filter((c) => {
        return !remoteCollectionIds.has(c.id.toString());
      }),
    [channels, collections]
  );

  const filteredChannels = useMemo(
    () =>
      debouncedSearch === ""
        ? nonDisabledChannels
        : filterItemsBySearchValue(channels || [], debouncedSearch, ["title"]),
    [channels, debouncedSearch, nonDisabledChannels]
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
          <XStack margin="$2">
            <Stack flexGrow={1} paddingRight="$2">
              <SearchBarInput
                backgroundColor="$gray4"
                searchValue={searchValue}
                setSearchValue={setSearchValue}
              />
            </Stack>
            <StyledButton
              flexShrink={1}
              theme="red"
              disabled={!selectedChannels.length}
            >
              <StyledText>clear ({selectedChannels.length})</StyledText>
            </StyledButton>
          </XStack>
          <ScrollView
            contentContainerStyle={{
              // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
              paddingBottom: 24,
            }}
            onScroll={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {filteredChannels?.map((channel, idx) => {
              const isDisabled = remoteCollectionIds.has(channel.id.toString());
              const isSelected = selectedChannelIds.includes(
                channel.id.toString()
              );

              return (
                <Stack
                  disabled={isDisabled}
                  key={channel.id.toString()}
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
              );
            })}
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
    </Stack>
  );
}
