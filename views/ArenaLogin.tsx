import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import {
  StyledButton,
  StyledParagraph,
  StyledText,
} from "../components/Themed";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Spinner, XStack } from "tamagui";

const SCHEME = Constants.platform?.scheme;

const ArenaClientId = "tnJRHmJZWUxJ3EG6OAraA_LoSjdjq2oiF_TbZFrUTIE";
// TODO: move these before open sourcing repo
const ArenaClientSecret = "jSpLG7pclKUxa_QcIfg6iv057TMK2Wz-Ma4f99ly9F0";
const ArenaTokenStorageKey = "arena-token";

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
    },
    discovery
  );
  const [token, setToken] = useState<string | undefined | null>(undefined);

  useEffect(() => {
    SecureStore.getItemAsync(ArenaTokenStorageKey).then((token) => {
      setToken(token);
    });
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      console.log("retrieved access token!", code);

      if (Platform.OS !== "web") {
        // Securely store the auth on your device
        SecureStore.setItemAsync(ArenaTokenStorageKey, code);
      }
      setToken(code);
    }
  }, [response]);

  //   TODO: if token already present render the token and make login button smaller.
  return token === undefined ? (
    <Spinner />
  ) : token ? (
    <XStack alignItems="center">
      <StyledParagraph
        ellipse
        wordWrap="break-word"
        width="50%"
        numberOfLines={3}
      >
        Current: {token}
      </StyledParagraph>
      <StyledButton
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
