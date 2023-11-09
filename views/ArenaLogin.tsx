import * as WebBrowser from "expo-web-browser";
import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import {
  StyledButton,
  StyledLabel,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Spinner, XStack, YStack } from "tamagui";
import {
  ArenaClientId,
  ArenaClientSecret,
  ArenaTokenStorageKey,
} from "../utils/arena";

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
  const [accessToken, setAccessToken] = useState<string | undefined | null>(
    undefined
  );

  useEffect(() => {
    SecureStore.getItemAsync(ArenaTokenStorageKey).then((token) => {
      setAccessToken(token);
    });
  }, []);

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
          if (Platform.OS !== "web") {
            // Securely store the auth on your device
            SecureStore.setItemAsync(ArenaTokenStorageKey, accessToken);
          }
          setAccessToken(accessToken);
        })
        .catch((exchangeError) => {
          throw exchangeError;
        });
    }
  }, [response]);

  //   TODO: if token already present render the token and make login button smaller.
  return accessToken === undefined ? (
    <Spinner />
  ) : accessToken ? (
    <XStack alignItems="center" space="$2" justifyContent="space-between">
      <YStack flex={1}>
        <StyledLabel fontWeight="bold">Token</StyledLabel>
        <StyledParagraph ellipse>{accessToken}</StyledParagraph>
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
