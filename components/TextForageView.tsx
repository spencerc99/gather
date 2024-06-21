import { useInfiniteQuery } from "@tanstack/react-query";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dimensions, Platform, SafeAreaView, ScrollView } from "react-native";
import { XStack, YStack } from "tamagui";
import { getFsPathForMediaResult } from "../utils/blobs";
import { BlockSelectLimit, DatabaseContext } from "../utils/db";
import { BlockType, MimeType } from "../utils/mimeTypes";
import { extractDataFromUrl, isUrl } from "../utils/url";
import { UserContext } from "../utils/user";
import { BlockTexts } from "./BlockTexts";
import { MediaView } from "./MediaView";
import { Icon, IconType, StyledButton, StyledTextArea } from "./Themed";
import { useFocusEffect, useNavigation } from "expo-router";
import { ErrorsContext } from "../utils/errors";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";

const Placeholders = [
  "Who do you love and why?",
  "What was the last link you sent?",
  "What was the last interesting thing you overhead?",
  "What do you want to remember?",
  "What caught your eye in the world today?",
  "What are you grateful for?",
  "What do you appreciate about a friend?",
  "What was your last photo of the sky?",
  "What words capture how you're feeling today?",
  "What made you love life today?",
  "What was the last song you found that slaps?",
  "Describe the last person you saw.",
  "What words do you want to live by?",
  "Who do you want to thank?",
  "What's on repeat in your head?",
  "What's resonating for you?",
];

interface PickedMedia {
  uri: string;
  type: BlockType;
  contentType?: MimeType;
  assetId?: string | null;
}

export function TextForageView({
  collectionId,
  isSearching,
}: {
  collectionId?: string;
  isSearching?: boolean;
}) {
  const [textValue, setTextValue] = useState("");
  const [medias, setMedias] = useState<PickedMedia[]>([]);
  const { createBlocks, shareIntent, getBlocks, getCollectionItems } =
    useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();
  const { currentUser } = useContext(UserContext);
  const [textPlaceholder, setTextPlaceholder] = useState(
    Placeholders[Math.floor(Math.random() * Placeholders.length)]
  );
  const queryKey = ["blocks", { collectionId }] as const;
  const { logError } = useContext(ErrorsContext);
  const bottomTabHeight = useBottomTabBarHeight();
  const keyboard = useAnimatedKeyboard();
  const [textFocused, setTextFocused] = useState(false);
  const translateStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: textFocused
        ? keyboard.height.value -
          bottomTabHeight +
          (Platform.OS === "android" ? 24 : 0)
        : 0,
    };
  }, [keyboard.height, textFocused]);

  const updatePlaceholder = useCallback(() => {
    setTextPlaceholder(
      Placeholders[Math.floor(Math.random() * Placeholders.length)]
    );
  }, []);

  useFocusEffect(updatePlaceholder);

  // TODO: toast the error
  const { data, error, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam: page, queryKey }) => {
        const [_, { collectionId }] = queryKey;

        const blocks = !collectionId
          ? await getBlocks({ page })
          : await getCollectionItems(collectionId, {
              page: page,
            });

        return {
          blocks,
          nextId: blocks.length < BlockSelectLimit ? null : page + 1,
          previousId: page === 0 ? null : page - 1,
        };
      },
      initialPageParam: 0,
      // TODO:
      getPreviousPageParam: (firstPage) => firstPage?.previousId ?? undefined,
      getNextPageParam: (lastPage) => lastPage?.nextId ?? undefined,
    });

  const blocks = useMemo(() => data?.pages.flatMap((p) => p.blocks), [data]);

  useEffect(() => {
    if (shareIntent !== null) {
      if (typeof shareIntent === "object") {
        setMedias([
          {
            uri: shareIntent.uri,
            type: BlockType.Image,
            assetId: null,
          },
        ]);
      } else {
        setTextValue(shareIntent);
      }
    }
  }, [shareIntent]);

  function fetchMoreBlocks() {
    if (!hasNextPage) {
      return;
    }
    fetchNextPage();
  }

  if (!currentUser) {
    return null;
  }

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // TODO: bring this back when actually supporting video, right now it doesn't show up
      // mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
      orderedSelection: true,
    });

    if (!result.canceled) {
      // TODO: preserve assetID in URI
      setMedias([
        ...medias,
        ...result.assets.map((asset) => ({
          uri: asset.uri,
          // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
          type: asset.type === "image" ? BlockType.Image : BlockType.Video,
          contentType: asset.mimeType as MimeType,
          assetId: asset.assetId,
        })),
      ]);
    }
  };

  const pickFile = async () => {
    // TODO: do DocumentPicker here
  };

  function removeMedia(idx: number) {
    setMedias(medias.filter((_, i) => i !== idx));
  }

  async function onSaveResult() {
    if (!textValue && !medias.length) {
      return;
    }

    const savedMedias = medias;
    const savedTextValue = textValue;
    setTextValue("");
    setMedias([]);
    const blocksToInsert = [];

    try {
      if (savedMedias.length) {
        const mediaToInsert = await Promise.all(
          savedMedias.map(async ({ uri, type, assetId, contentType }) => {
            // TODO: this is only accounting for iphone.
            const fileUri = await getFsPathForMediaResult(
              uri,
              type === BlockType.Image ? "jpg" : "mp4",
              assetId
            );
            return {
              createdBy: currentUser!.id,
              content: fileUri,
              type,
              // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
              localAssetId: assetId || undefined,
              contentType,
            };
          })
        );
        blocksToInsert.push(...mediaToInsert);
      }

      if (savedTextValue) {
        // TODO: do this check after insert as text value and then do an update to make it super fast.
        if (isUrl(savedTextValue)) {
          const { title, description, images, url, favicon } =
            await extractDataFromUrl(savedTextValue);
          blocksToInsert.push({
            createdBy: currentUser!.id,
            // TODO: try to capture a picture of the url always
            content: images?.[0] || favicon || "",
            title,
            description,
            source: url,
            type: BlockType.Link,
            collectionsToConnect: collectionId ? [collectionId] : [],
          });
        } else {
          blocksToInsert.push({
            createdBy: currentUser!.id,
            content: savedTextValue,
            type: BlockType.Text,
            collectionsToConnect: collectionId ? [collectionId] : [],
          });
        }
      }

      await createBlocks({
        blocksToInsert,
        collectionId,
      });
    } catch (err) {
      logError(err);
    }
  }

  // TODO: fix this to actually pick up the sound
  async function startRecording() {
    try {
      console.log("Requesting permissions..");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      logError("Failed to start recording");
    }
  }

  async function stopRecording() {
    console.log("Stopping recording..");
    if (!recording) {
      return;
    }
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    setMedias([
      ...medias,
      {
        uri: uri!,
        type: BlockType.Audio,
      },
    ]);
  }

  return isSearching ? null : ( // TODO: integrate the search directly into the chat box
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      {/* <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={"padding"}
        contentContainerStyle={{
          justifyContent: "space-between",
          flex: 1,
        }}
        enabled
        // NOTE: this needs to adjust based on the height of YStack below
        // TODO: make this smaller when there is a collectionId (because tabs don't show)
        keyboardVerticalOffset={insets.top + 44}
      > */}
      <Animated.View
        style={[{ flex: 1, justifyContent: "space-between" }, translateStyle]}
      >
        <BlockTexts
          collectionId={collectionId}
          // TODO: types
          blocks={blocks ? blocks : null}
          fetchMoreBlocks={fetchMoreBlocks}
          isFetchingNextPage={isFetchingNextPage}
        />
        <YStack
          height="auto"
          borderTopEndRadius={4}
          borderTopStartRadius={4}
          borderRadius={4}
          elevation="$2"
          backgroundColor="$background"
        >
          <XStack gap="$1" width="100%">
            {medias.length > 0 && (
              <ScrollView horizontal={true}>
                <XStack flexWrap="wrap" gap="$2" paddingTop="$1">
                  {medias.map(({ uri, type }, idx) => (
                    <YStack width={150} height={150} key={uri} borderRadius={8}>
                      <MediaView
                        media={uri}
                        blockType={type}
                        style={{
                          aspectRatio: 1,
                          resizeMode: "cover",
                          // @ts-ignore
                          borderRadius: "$2",
                        }}
                      />
                      <StyledButton
                        icon={<Icon name="remove" />}
                        size="$5"
                        theme="red"
                        circular
                        position="absolute"
                        top={4}
                        right={2}
                        onPress={() => {
                          removeMedia(idx);
                        }}
                      />
                    </YStack>
                  ))}
                </XStack>
              </ScrollView>
            )}
          </XStack>
          {/* <XStack alignItems="flex-start" gap={4} width="100%" marginBottom={8}> */}
          {/* radial menu? */}
          {/* <StyledButton
              icon={<Icon name="photo" />}
              onPress={pickImage}
              theme="orange"
            /> */}
          {/* <StyledButton
              icon={<Icon name="file" />}
              onPress={pickFile}
              theme="purple"
            /> */}
          {/* TODO: access camera */}
          {/* <StyledButton
              icon={
                recording ? <Icon name="stop" /> : <Icon name="microphone" />
              }
              theme="green"
              onPress={recording ? stopRecording : startRecording}
            /> */}
          {/* </XStack> */}
          <XStack
            alignItems="center"
            justifyContent="center"
            padding="$2"
            gap="$"
            position="relative"
          >
            <StyledButton
              icon={<Icon size={24} name="images" />}
              onPress={pickImage}
              paddingHorizontal="$2"
              theme="grey"
              chromeless
              alignSelf="flex-end"
            />
            <YStack position="absolute" zIndex={1} right="$1.5" bottom="$2">
              <StyledButton
                onPress={async () => {
                  void onSaveResult();
                }}
                chromeless
                marginHorizontal="$2"
                paddingVertical={0}
                paddingHorizontal={0}
                disabled={!textValue && !medias.length}
                alignSelf="flex-end"
                theme="green"
                icon={
                  <Icon
                    name="arrow-forward-circle-sharp"
                    size={28}
                    color="$green10"
                    type={IconType.Ionicons}
                  />
                }
              ></StyledButton>
            </YStack>
            <StyledTextArea
              // NOTE: idk why but the padding is huge on android lol
              padding={Platform.OS === "android" ? "$2" : undefined}
              paddingRight="$6"
              placeholder={textPlaceholder}
              minHeight={undefined}
              flex={1}
              maxLength={2000}
              onChangeText={(text) => {
                setTextValue(text);
              }}
              maxHeight={Dimensions.get("window").height / 2}
              value={textValue}
              enablesReturnKeyAutomatically
              onFocus={() => {
                setTextFocused(true);
              }}
              onBlur={() => {
                setTextFocused(false);
              }}
            />
          </XStack>
        </YStack>
      </Animated.View>
      {/* </KeyboardAvoidingView> */}
    </SafeAreaView>
  );
}
