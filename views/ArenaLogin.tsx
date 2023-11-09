import * as WebBrowser from "expo-web-browser";
import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { useContext, useEffect, useState } from "react";
import {
  Icon,
  InputWithIcon,
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

const SCHEME = Constants.platform?.scheme;

WebBrowser.maybeCompleteAuthSession();

// Endpoint
const discovery = {
  authorizationEndpoint: "http://dev.are.na/oauth/authorize",
  tokenEndpoint: "https://dev.are.na/oauth/token",
};

const redirectUri = makeRedirectUri({
  scheme: SCHEME,
  path: "internal",
});
console.log("REDIRECT", redirectUri);

export function ArenaLogin() {
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

  //   TODO: if token already present render the token and make login button smaller.
  return arenaAccessToken === undefined ? (
    <Spinner />
  ) : arenaAccessToken ? (
    <XStack alignItems="center" space="$2" justifyContent="space-between">
      <YStack flex={1}>
        <StyledLabel fontWeight="bold">Token</StyledLabel>
        <StyledParagraph ellipse>{arenaAccessToken}</StyledParagraph>
      </YStack>
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
    </XStack>
  ) : (
    <StyledButton
      disabled={!request}
      onPress={() => {
        promptAsync();
      }}
      theme="black"
    >
      Login to Arena
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
}: {
  arenaChannel: string;
  setArenaChannel: (arenaChannel: string) => void;
}) {
  const { arenaAccessToken } = useContext(DatabaseContext);
  const [channels, setChannels] = useState<ArenaChannelInfo[] | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (arenaAccessToken) {
      void getUserChannels(arenaAccessToken).then((channels) => {
        setChannels(channels);
      });
    } else {
      setChannels([]);
    }
  }, [arenaAccessToken]);

  return arenaAccessToken ? (
    <Select
      native
      onValueChange={setSelectedChannel}
      // @ts-ignore
      value={selectedChannel}
      disablePreventBodyScroll
    >
      <Select.Trigger elevation="$3">
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
          modal
          native
          animationConfig={{
            type: "spring",
            damping: 20,
            mass: 1.2,
            stiffness: 150,
          }}
          dismissOnSnapToBottom
        >
          <Sheet.Frame>
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      <Select.Content zIndex={200000}>
        <Select.Viewport
          // to do animations:
          animation="quick"
          animateOnly={["transform", "opacity"]}
          enterStyle={{ o: 0, y: -10 }}
          exitStyle={{ o: 0, y: 10 }}
          minWidth={200}
        >
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
            <Select.Group>
              {filterItemsBySearchValue(channels || [], searchValue, [
                "title",
              ])?.map((channel, idx) => (
                <Select.Item
                  index={idx + 1}
                  key={channel.id}
                  value={channel.id.toString()}
                  backgroundColor={
                    selectedChannel === channel.id.toString()
                      ? "$green4"
                      : undefined
                  }
                >
                  <CollectionSummary
                    collection={{
                      ...mapSnakeCaseToCamelCaseProperties(channel),
                      description: channel.metadata?.description || undefined,
                      thumbnail: channel.contents?.find(
                        (c) => c.image?.thumb.url
                      )?.image?.thumb.url,
                      remoteSourceType: RemoteSourceType.Arena,
                      numBlocks: channel.length,
                      createdAt: new Date(channel.created_at),
                      updatedAt: new Date(channel.updated_at),
                      lastConnectedAt: new Date(channel.added_to_at),
                      createdBy: channel.user.slug,
                    }}
                    viewProps={{
                      borderWidth: 0,
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      backgroundColor: "inherit",
                    }}
                  />
                  <Select.ItemText display="none">
                    {channel.title}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </ScrollView>
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
