import {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import { useDebounceValue, XStack, ScrollView, Stack, Sheet } from "tamagui";
import { ArenaChannelInfo, getUserChannels } from "../../utils/arena";
import { RemoteSourceType } from "../../utils/dataTypes";
import { DatabaseContext } from "../../utils/db";
import { filterItemsBySearchValue } from "../../utils/search";
import { Icon, SearchBarInput, StyledButton, StyledText } from "../Themed";
import { ArenaChannelSummary } from "./ArenaChannelSummary";
import { FlatList, InteractionManager } from "react-native";

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
  const { arenaAccessToken, collections } = useContext(DatabaseContext);
  const [channels, setChannels] = useState<ArenaChannelInfo[] | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (arenaAccessToken) {
      InteractionManager.runAfterInteractions(async () => {
        await getUserChannels(arenaAccessToken).then((channels) => {
          setChannels(channels);
        });
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

  const selectedChannelIds = useMemo(
    () => selectedChannels.map((c) => c.id.toString()),
    [selectedChannels]
  );

  const renderChannel = useCallback(
    ({ item, index: idx }: { item: ArenaChannelInfo; index: number }) => {
      const channel = item;
      const isDisabled = remoteCollectionIds.has(channel.id.toString());
      const isSelected = selectedChannelIds.includes(channel.id.toString());
      return (
        <ChannelView
          channel={channel}
          toggleChannel={toggleChannel}
          isDisabled={isDisabled}
          isSelected={isSelected}
        />
      );
    },
    [selectedChannelIds, selectedChannels, remoteCollectionIds]
  );

  if (!arenaAccessToken) {
    return null;
  }

  return (
    <Stack>
      <XStack justifyContent="center" width="100%" alignItems="center" gap="$2">
        <StyledButton flexGrow={1} onPress={() => setOpen(true)} theme="grey">
          {!channels
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
              size="$small"
            >
              cancel
            </StyledButton>
          </XStack>
          <Sheet.ScrollView>
            <FlatList
              contentContainerStyle={{
                // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
                paddingBottom: 24,
              }}
              onScroll={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              data={filteredChannels}
              renderItem={renderChannel}
            />
          </Sheet.ScrollView>
        </Sheet.Frame>
      </Sheet>
    </Stack>
  );
}
