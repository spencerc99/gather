import { memo, useCallback, useContext, useMemo, useState } from "react";
import { FlatList, useColorScheme } from "react-native";
import {
  Sheet,
  Spinner,
  Stack,
  XStack,
  YStack,
  useDebounceValue,
} from "tamagui";
import { ArenaChannelInfo } from "../../utils/arena";
import { useArenaUserChannels } from "../../utils/hooks/useArenaUserChannels";
import { SearchBarInput, StyledButton } from "../Themed";
import { ArenaChannelSummary } from "./ArenaChannelSummary";
import { UserContext } from "../../utils/user";

const ChannelView = memo(
  ({
    channel,
    toggleChannel,
    viewProps,
    isDisabled,
    isSelected,
  }: {
    channel: ArenaChannelInfo;
    toggleChannel: (channel: ArenaChannelInfo, isSelected: boolean) => void;
    viewProps?: object;
    isDisabled: boolean;
    isSelected: boolean;
  }) => (
    <Stack
      disabled={isDisabled}
      key={channel.id.toString()}
      backgroundColor={isSelected ? "$green4" : undefined}
      opacity={isDisabled ? 0.5 : undefined}
      onPress={() => toggleChannel(channel, isSelected)}
    >
      <ArenaChannelSummary channel={channel} isDisabled={isDisabled} />
    </Stack>
  )
);

export function ArenaChannelMultiSelect({
  selectedChannels,
  setSelectedChannels,
}: {
  selectedChannels: ArenaChannelInfo[];
  setSelectedChannels: (selectedChannels: ArenaChannelInfo[]) => void;
}) {
  const { arenaAccessToken } = useContext(UserContext);
  const colorScheme = useColorScheme();
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);
  const [open, setOpen] = useState(false);

  const toggleChannel = useCallback(
    (channel: ArenaChannelInfo, isSelected: boolean) => {
      if (isSelected) {
        setSelectedChannels(
          selectedChannels.filter(
            (c) => c.id.toString() !== channel.id.toString()
          )
        );
      } else {
        setSelectedChannels([...selectedChannels, channel]);
      }
    },
    [selectedChannels, setSelectedChannels]
  );

  const selectedChannelIds = useMemo(
    () => selectedChannels.map((c) => c.id.toString()),
    [selectedChannels]
  );

  const { channels, isLoading, isFetchingNextPage, fetchMore } =
    useArenaUserChannels(debouncedSearch);

  const sortedAndAnnotatedChannels = useMemo(() => {
    const mapped = (channels || []).map((channel) => ({
      ...channel,
      isSelected: selectedChannelIds.includes(channel.id.toString()),
    }));
    if (!searchValue) {
      mapped.sort((a, b) => {
        // sort selected channels to top
        if (a.isSelected && !b.isSelected) {
          return -1;
        }
        if (!a.isSelected && b.isSelected) {
          return 1;
        }
        return 0;
      });
    }
    return mapped;
  }, [channels]);

  const renderChannel = useCallback(
    ({
      item,
      index: idx,
    }: {
      item: ArenaChannelInfo & { isDisabled: boolean; isSelected: boolean };
      index: number;
    }) => {
      const channel = item;
      return (
        <ChannelView
          key={channel.id.toString()}
          channel={channel}
          toggleChannel={toggleChannel}
          isDisabled={channel.isDisabled}
          isSelected={channel.isSelected}
        />
      );
    },
    [selectedChannelIds, selectedChannels]
  );

  if (!arenaAccessToken) {
    return null;
  }

  return (
    <Stack>
      <XStack justifyContent="center" width="100%" alignItems="center" gap="$2">
        <StyledButton
          flexGrow={1}
          onPress={() => setOpen(true)}
          theme="grey"
          backgroundColor={colorScheme === "light" ? "$gray5" : undefined}
        >
          {isLoading
            ? "Loading from are.na..."
            : selectedChannels.length > 0
            ? "Configure channels"
            : "Select channels to import"}
        </StyledButton>
        {selectedChannels.length > 0 && (
          <StyledButton
            flexShrink={1}
            theme="grey"
            borderRadius={100}
            disabled={!selectedChannels.length}
            onPress={() => setSelectedChannels([])}
            size="$small"
          >
            cancel
          </StyledButton>
        )}
      </XStack>

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
        <Sheet.Frame padding="$1" gap="$2">
          <XStack margin="$2" alignItems="center">
            <Stack flexGrow={1} paddingRight="$2">
              <SearchBarInput
                backgroundColor="$gray4"
                searchValue={searchValue}
                setSearchValue={setSearchValue}
              />
            </Stack>
            <StyledButton
              flexShrink={1}
              theme="grey"
              borderRadius={100}
              disabled={!selectedChannels.length}
              onPress={() => {
                setSelectedChannels([]);
                setOpen(false);
              }}
              backgroundColor={colorScheme === "light" ? "$gray5" : undefined}
              size="$small"
            >
              cancel
            </StyledButton>
          </XStack>
          {isLoading ? (
            <Spinner size="small" color="$orange9" />
          ) : (
            <FlatList
              contentContainerStyle={{
                // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
                paddingBottom: 24,
              }}
              onScroll={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              data={sortedAndAnnotatedChannels}
              renderItem={renderChannel}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <YStack
                    justifyContent="center"
                    alignSelf="center"
                    alignItems="center"
                    width="100%"
                  >
                    <Spinner size="small" color="$orange9" />
                  </YStack>
                ) : null
              }
              onEndReachedThreshold={0.3}
              onEndReached={() => {
                if (!open) {
                  return;
                }
                fetchMore();
              }}
            />
          )}
        </Sheet.Frame>
      </Sheet>
    </Stack>
  );
}
