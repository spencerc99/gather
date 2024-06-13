import { Link, Stack, useRouter } from "expo-router";
import { useContext, useMemo, useState } from "react";
import { Platform, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Spinner, XStack, YStack, useWindowDimensions } from "tamagui";
import { Block, RemoteSourceType } from "../utils/dataTypes";
import { DatabaseContext, useBlockConnections } from "../utils/db";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { BlockSummary } from "./BlockSummary";
import { ConnectionSummary } from "./ConnectionSummary";
import {
  ArenaLogo,
  EditableTextOnClick,
  ExternalLinkText,
  Icon,
  IconType,
  StyledButton,
  StyledParagraph,
  StyledText,
  StyledView,
} from "./Themed";
import { ExternalLink } from "./ExternalLink";
import { UserContext, extractCreatorFromCreatedBy } from "../utils/user";
import { ensureUnreachable } from "../utils/react";
import { useStickyValue } from "../utils/asyncStorage";
import { RawArenaUser } from "../utils/arena";

function getDisplayForCreatedBy(
  createdBy: string,
  arenaUserInfo: RawArenaUser | null
) {
  const { userId, source } = extractCreatorFromCreatedBy(createdBy);
  if (!source) {
    return "you";
  }
  switch (source) {
    case RemoteSourceType.Arena:
      return (
        <>
          <StyledText>
            <ExternalLinkText href={`https://are.na/${userId}`}>
              {arenaUserInfo && userId === arenaUserInfo.slug ? "you" : userId}
            </ExternalLinkText>{" "}
          </StyledText>
          <ArenaLogo />
        </>
      );
    default:
      return ensureUnreachable(source);
  }
}

export function BlockDetailView({ block }: { block: Block }) {
  const {
    id,
    title,
    description,
    source,
    createdAt,
    createdBy,
    updatedAt,
    remoteSourceInfo,
    contentType,
    localAssetId,
  } = block;

  const [isLoading, setIsLoading] = useState(false);
  const transformedSource = useMemo(() => {
    // remove query params
    if (!source) {
      return source;
    }
    const url = new URL(source);
    return url.origin + url.pathname;
  }, [source]);

  const router = useRouter();
  const { updateBlock } = useContext(DatabaseContext);
  const { arenaUserInfo } = useContext(UserContext);
  const { data: connections, isLoading: loadingData } = useBlockConnections(
    id.toString()
  );
  const hasRemoteConnection = useMemo(
    () => connections?.some((c) => Boolean(c.remoteSourceType)),
    [connections]
  );
  const createdByDisplay = getDisplayForCreatedBy(createdBy, arenaUserInfo);
  const [devModeEnabled] = useStickyValue("devModeEnabled", false);

  useFixExpoRouter3NavigationTitle();

  async function update(updateFn: () => ReturnType<typeof updateBlock>) {
    setIsLoading(true);
    try {
      await updateFn();
    } finally {
      setIsLoading(false);
    }
  }
  const height = useWindowDimensions().height;

  // TODO: proactively look for updates from arena (title, description) and call handleBlockRemoteUpdate
  return (
    <>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: "10%",
        }}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        scrollToOverflowEnabled
        extraScrollHeight={40}
      >
        <Stack.Screen
          options={{
            title: "",
            // TODO: [ANDROID] this issue makes the back button disappear for androis... https://github.com/react-navigation/react-navigation/issues/10391 if you change headerTitle..
            // workaround is to make the native one not show and then render a custom one lol
            ...{
              [Platform.OS === "android" ? "headerRight" : "headerTitle"]: () =>
                isLoading ? (
                  <XStack gap="$2" justifyContent="center">
                    <Spinner />
                    <StyledText>Updating...</StyledText>
                  </XStack>
                ) : undefined,
            },
          }}
        />
        <YStack gap="$2" marginBottom="$2" flexGrow={1}>
          <EditableTextOnClick
            inputProps={{
              title: true,
              enterKeyHint: "done",
            }}
            text={title}
            defaultText="Add a title..."
            disabled={isLoading}
            onEdit={async (newTitle) => {
              await update(
                async () =>
                  await updateBlock({
                    blockId: id,
                    editInfo: { title: newTitle },
                  })
              );
            }}
          />
          {/* TODO: on delete navigate back */}
          <BlockSummary
            block={block}
            blockStyle={{
              objectFit: "contain",
              aspectRatio: undefined,
              maxHeight: "100%",
            }}
            style={{}}
            containerProps={{
              paddingBottom: "$2",
              maxHeight: height / 2,
              width: "100%",
            }}
            hideMetadata
          />
          {/* TODO: don't show hold item actions and render them inline instead */}
          <EditableTextOnClick
            inputProps={{ metadata: true }}
            text={description}
            defaultText="Add a description..."
            multiline
            disabled={isLoading}
            onEdit={async (newDescription) => {
              await update(
                async () =>
                  await updateBlock({
                    blockId: id,
                    editInfo: { description: newDescription },
                  })
              );
            }}
          />
          {createdBy && createdByDisplay !== "you" && (
            <XStack alignItems="center">
              <StyledText metadata>Created by </StyledText>
              {createdByDisplay}
            </XStack>
          )}
          {/* TODO: genericize when opening up remote sources */}
          {remoteSourceInfo ? (
            <XStack alignItems="center">
              <StyledText metadata>
                Block{" "}
                <ExternalLink
                  href={`https://are.na/block/${remoteSourceInfo.arenaId}`}
                >
                  <StyledParagraph link>
                    {remoteSourceInfo.arenaId}
                  </StyledParagraph>
                </ExternalLink>{" "}
              </StyledText>
              <ArenaLogo />
            </XStack>
          ) : hasRemoteConnection ? (
            <XStack alignItems="center">
              <StyledText metadata>Waiting to sync to </StyledText>
              <ArenaLogo />
              <StyledText metadata> ...</StyledText>
            </XStack>
          ) : null}
          <StyledView gap="$1">
            {/* <StyledParagraph metadata>By: {createdBy}</StyledParagraph> */}
            {source && (
              <StyledText metadata>
                From:{" "}
                <ExternalLinkText href={source}>
                  {transformedSource}
                </ExternalLinkText>
              </StyledText>
            )}
            <StyledParagraph metadata>
              Created: {createdAt.toLocaleDateString()}
            </StyledParagraph>
            <StyledParagraph metadata>
              Updated: {updatedAt.toLocaleDateString()}
            </StyledParagraph>
            {(__DEV__ || devModeEnabled) && (
              <>
                <StyledParagraph metadata>ID: {id}</StyledParagraph>
                {contentType && (
                  <StyledParagraph metadata>{contentType}</StyledParagraph>
                )}
                {localAssetId && (
                  <StyledParagraph metadata>
                    asset ID: {localAssetId}
                  </StyledParagraph>
                )}
              </>
            )}
          </StyledView>
          <StyledButton
            icon={<Icon name="link" type={IconType.FontAwesome6Icon} />}
            onPress={() => {
              router.push({
                pathname: "/block/[id]/connect",
                params: { id },
              });
            }}
          >
            Connect
          </StyledButton>
          {/* TODO: separate by your connections vs. friends vs world? */}
          {loadingData ? (
            <Spinner color="$orange9" size="small" />
          ) : (
            connections?.map((connection) => (
              // TODO: jump to the location of the block??
              <Link
                key={connection.collectionId}
                href={{
                  pathname: "/(tabs)/home",
                  params: {
                    collectionId: connection.collectionId,
                  },
                }}
                asChild
              >
                <Pressable>
                  <ConnectionSummary connection={connection} />
                </Pressable>
              </Link>
            ))
          )}
        </YStack>
      </KeyboardAwareScrollView>
    </>
  );
}
