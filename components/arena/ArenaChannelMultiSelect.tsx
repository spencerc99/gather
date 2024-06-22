import { memo, useCallback, useContext, useMemo, useState } from "react";
import { FlatList, useColorScheme } from "react-native";
import {
  Sheet,
  Spinner,
  Stack,
  ToggleGroup,
  XStack,
  YStack,
  useDebounceValue,
} from "tamagui";
import { ArenaChannelInfo } from "../../utils/arena";
import {
  ChannelScope,
  useArenaChannels,
} from "../../utils/hooks/useArenaUserChannels";
import { SearchBarInput, StyledButton, StyledText } from "../Themed";
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
  const [toggleValue, setToggleValue] = useState<ChannelScope>(
    ChannelScope.User
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

  const selectedChannelIds = useMemo(
    () => selectedChannels.map((c) => c.id.toString()),
    [selectedChannels]
  );

  const { channels, isLoading, isFetchingNextPage, fetchMore, error } =
    useArenaChannels(debouncedSearch, toggleValue);

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
  }, [channels, searchValue]);

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
        <StyledButton flexGrow={1} onPress={() => setOpen(true)} theme="gray">
          {error
            ? error.message || "Error loading channels from Are.na"
            : isLoading
            ? "Loading from are.na..."
            : selectedChannels.length > 0
            ? "Configure channels"
            : "Select channels to import"}
        </StyledButton>
        {selectedChannels.length > 0 && (
          <StyledButton
            flexShrink={1}
            theme="gray"
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
        animationConfig={{
          type: "spring",
          damping: 10,
          mass: 0.3,
          stiffness: 120,
        }}
        onOpenChange={setOpen}
        snapPoints={[80]}
        animation="quick"
        dismissOnSnapToBottom
      >
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle />
        <Sheet.Frame padding="$1" gap="$2" paddingBottom="$4">
          <XStack marginHorizontal="$2" alignItems="center" marginTop="$2">
            <ToggleGroup
              flex={1}
              theme="blue"
              type="single"
              disableDeactivation
              value={toggleValue}
              onValueChange={setToggleValue}
            >
              {Object.keys(ChannelScope).map((scope) => (
                <ToggleGroup.Item
                  key={scope}
                  flex={1}
                  value={scope}
                  backgroundColor={toggleValue === scope ? "$blue6" : undefined}
                >
                  <StyledText>{scope} channels</StyledText>
                </ToggleGroup.Item>
              ))}
            </ToggleGroup>
          </XStack>
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
              theme="gray"
              borderRadius={100}
              disabled={!selectedChannels.length}
              onPress={() => {
                setSelectedChannels([]);
              }}
              backgroundColor={
                selectedChannels.length && colorScheme === "light"
                  ? "$gray5"
                  : undefined
              }
              size="$small"
            >
              clear
            </StyledButton>
          </XStack>
          {isLoading ? (
            <Spinner size="small" color="$orange9" />
          ) : (
            <FlatList
              // @ts-ignore
              renderScrollComponent={(props) => <Sheet.ScrollView {...props} />}
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
                <YStack
                  justifyContent="center"
                  alignSelf="center"
                  alignItems="center"
                  width="100%"
                >
                  {isFetchingNextPage && (
                    <Spinner size="small" color="$orange9" />
                  )}
                </YStack>
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
          <StyledButton
            theme="green"
            onPress={() => {
              setOpen(false);
            }}
            marginTop="auto"
          >
            Done selecting
          </StyledButton>
        </Sheet.Frame>
      </Sheet>
    </Stack>
  );
}
