import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useContext, useEffect, useState } from "react";
import { FlatList } from "react-native";
import {
  Adapt,
  Select,
  Sheet,
  Spinner,
  XStack,
  YStack,
  YStackProps,
  useDebounceValue,
} from "tamagui";
import {
  ArenaLogo,
  Icon,
  SearchBarInput,
  StyledButton,
  StyledInput,
  StyledLabel,
} from "../components/Themed";
import { ArenaChannelSummary } from "../components/arena/ArenaChannelSummary";
import {
  ArenaChannelInfo,
  ArenaChannelRegex,
  ArenaClientId,
  ArenaClientSecret,
} from "../utils/arena";
import { DatabaseContext } from "../utils/db";
import { useArenaUserChannels } from "../utils/hooks/useArenaUserChannels";

const SCHEME = Constants.platform?.scheme;

WebBrowser.maybeCompleteAuthSession();

// Endpoint
const discovery = {
  authorizationEndpoint: "http://dev.are.na/oauth/authorize",
  tokenEndpoint: "https://dev.are.na/oauth/token",
};

export function ArenaLogin({ path }: { path: string }) {
  const redirectUri = makeRedirectUri({
    scheme: SCHEME,
    path,
  });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: ArenaClientId,
      clientSecret: ArenaClientSecret,
      redirectUri,
      codeChallenge: undefined,
      codeChallengeMethod: undefined,
      usePKCE: false,
      state: undefined,
    },
    discovery
  );
  const { arenaAccessToken, updateArenaAccessToken } =
    useContext(DatabaseContext);

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;

      exchangeCodeAsync(
        {
          clientId: ArenaClientId,
          clientSecret: ArenaClientSecret,
          code,
          redirectUri,
        },
        discovery
      )
        .then((token) => {
          const { accessToken } = token;
          updateArenaAccessToken(accessToken);
        })
        .catch((exchangeError) => {
          throw exchangeError;
        });
    }
  }, [response]);

  return arenaAccessToken === undefined ? (
    <Spinner />
  ) : arenaAccessToken ? (
    <XStack alignItems="center" space="$2" justifyContent="space-between">
      <StyledButton
        flex={1}
        disabled={!request}
        onPress={() => {
          promptAsync();
        }}
        theme="green"
      >
        Login again
      </StyledButton>
      <StyledButton
        flex={1}
        disabled={!request}
        onPress={() => {
          updateArenaAccessToken(null);
        }}
        theme="red"
      >
        Logout
      </StyledButton>
    </XStack>
  ) : (
    <StyledButton
      disabled={!request}
      onPress={() => {
        promptAsync();
      }}
      theme="green"
    >
      Login to Arena
      <ArenaLogo
        style={{
          marginLeft: -6,
        }}
      />
    </StyledButton>
  );
}

// http://dev.are.na/oauth/authorize
// ?client_id=YOUR_CLIENT_ID
// &redirect_uri=YOUR_CALLBACK_URL
// &response_type=code </pre>

// POST https://dev.are.na/oauth/token
// ?client_id=THE_ID
// &client_secret=THE_SECRET
// &code=RETURNED_CODE
// &grant_type=authorization_code
// &redirect_uri=YOUR_CALLBACK_URL</pre>

export function SelectArenaChannel({
  arenaChannel,
  setArenaChannel,
  frameProps,
  overlayProps,
  modal = true,
}: {
  arenaChannel: string;
  setArenaChannel: (arenaChannel: string) => void;
  frameProps?: YStackProps;
  overlayProps?: YStackProps;
  modal?: boolean;
}) {
  const { arenaAccessToken } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounceValue(searchValue, 300);

  const { channels, isLoading, isFetchingNextPage, fetchMore } =
    useArenaUserChannels(debouncedSearch);

  const renderChannel = useCallback(
    ({
      item,
      index: idx,
    }: {
      item: ArenaChannelInfo & { isDisabled: boolean };
      index: number;
    }) => {
      const channel = item;
      const { isDisabled } = channel;
      return (
        <Select.Item
          disabled={isDisabled}
          index={idx + 1}
          key={channel.id}
          value={channel.id.toString()}
          backgroundColor={
            arenaChannel === channel.id.toString() ? "$green4" : undefined
          }
          opacity={isDisabled ? 0.5 : undefined}
        >
          <ArenaChannelSummary
            channel={channel}
            isDisabled={isDisabled}
            viewProps={{
              paddingHorizontal: 0,
              paddingVertical: 0,
            }}
          />
          <Select.ItemText display="none">{channel.title}</Select.ItemText>
        </Select.Item>
      );
    },
    []
  );

  return arenaAccessToken ? (
    <Select
      native
      onValueChange={setArenaChannel}
      // @ts-ignore
      value={arenaChannel}
      disablePreventBodyScroll
      open={open}
      onOpenChange={setOpen}
    >
      <Select.Trigger elevation="$3" disabled={!channels}>
        <Select.Value
          placeholder={
            !channels
              ? "Loading from are.na..."
              : "Pick one of your are.na channels"
          }
        />
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet
          modal={modal}
          animationConfig={{
            type: "spring",
            damping: 20,
            mass: 1.2,
            stiffness: 150,
          }}
          dismissOnSnapToBottom
        >
          <Sheet.Frame {...frameProps}>
            <Adapt.Contents />
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            {...overlayProps}
          />
        </Sheet>
      </Adapt>

      <Select.Content zIndex={2000000}>
        <Select.Viewport
          // to do animations:
          animation="quick"
          animateOnly={["transform", "opacity"]}
          enterStyle={{ o: 0, y: -10 }}
          exitStyle={{ o: 0, y: 10 }}
          minWidth={200}
        >
          <YStack margin="$2">
            <SearchBarInput
              backgroundColor="$gray4"
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              placeholder="Search channels..."
            />
          </YStack>
          {isLoading ? (
            <Spinner size="small" color="$orange9" />
          ) : (
            <FlatList
              contentContainerStyle={{
                // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
                paddingBottom: 64,
              }}
              onScroll={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              data={channels}
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
        </Select.Viewport>

        <Select.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <Icon name="chevron-down" size={20} />
          </YStack>
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  ) : (
    <>
      <StyledInput
        value={arenaChannel}
        onChangeText={(text) => setArenaChannel(text)}
        placeholder="https://are.na/spencer-chang/basket-sjuhif_oeqk"
        autogrow
        returnKeyType="done"
      />
      {arenaChannel && !ArenaChannelRegex.test(arenaChannel) && (
        <StyledLabel color="$red9" paddingBottom="$1">
          Invalid channel URL. Please go to the channel and copy and paste the
          url here.
        </StyledLabel>
      )}
    </>
  );
}
