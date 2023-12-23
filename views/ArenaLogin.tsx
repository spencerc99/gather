import * as WebBrowser from "expo-web-browser";
import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { useContext, useEffect, useMemo, useState } from "react";
import { Image } from "react-native";
import {
  ArenaLogo,
  Icon,
  SearchBarInput,
  StyledButton,
  StyledInput,
  StyledLabel,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import Constants from "expo-constants";
import {
  Adapt,
  Sheet,
  ScrollView,
  Select,
  Spinner,
  XStack,
  YStack,
  useDebounceValue,
  YStackProps,
} from "tamagui";
import {
  ArenaChannelInfo,
  ArenaChannelRegex,
  ArenaClientId,
  ArenaClientSecret,
  getUserChannels,
} from "../utils/arena";
import {
  DatabaseContext,
  mapSnakeCaseToCamelCaseProperties,
} from "../utils/db";
import { CollectionSummary } from "../components/CollectionSummary";
import { RemoteSourceType } from "../utils/dataTypes";
import { filterItemsBySearchValue } from "../utils/search";
import { ArenaChannelSummary } from "../components/arena/ArenaChannelSummary";

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
  const { arenaAccessToken, collections } = useContext(DatabaseContext);
  const [channels, setChannels] = useState<ArenaChannelInfo[] | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);

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

  return arenaAccessToken ? (
    <Select
      native
      onValueChange={setArenaChannel}
      // @ts-ignore
      value={arenaChannel}
      disablePreventBodyScroll
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
          <Sheet.ScrollView
            contentContainerStyle={{
              // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
              paddingBottom: 24,
            }}
          >
            <Select.Group>
              {filteredChannels?.map((channel, idx) => {
                const isDisabled = remoteCollectionIds.has(
                  channel.id.toString()
                );
                return (
                  <Select.Item
                    disabled={isDisabled}
                    index={idx + 1}
                    key={channel.id}
                    value={channel.id.toString()}
                    backgroundColor={
                      arenaChannel === channel.id.toString()
                        ? "$green4"
                        : undefined
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
                    <Select.ItemText display="none">
                      {channel.title}
                    </Select.ItemText>
                  </Select.Item>
                );
              })}
            </Select.Group>
          </Sheet.ScrollView>
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
