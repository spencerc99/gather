import { useInfiniteQuery } from "@tanstack/react-query";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dimensions, Linking, Platform, ScrollView } from "react-native";
import { Spinner, XStack, YStack } from "tamagui";
import { getFsPathForMediaResult } from "../utils/blobs";
import { BlockSelectLimit, DatabaseContext } from "../utils/db";
import { BlockType, MimeType } from "../utils/mimeTypes";
import { extractDataFromUrl, isUrl } from "../utils/url";
import { UserContext } from "../utils/user";
import { BlockTexts } from "./BlockTexts";
import { MediaView } from "./MediaView";
import {
  Icon,
  IconType,
  StyledButton,
  StyledText,
  StyledTextArea,
  StyledView,
} from "./Themed";
import { useFocusEffect } from "expo-router";
import { ErrorsContext } from "../utils/errors";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlockInsertInfo } from "../utils/dataTypes";
import { AppSettingType, getAppSetting } from "../app/settings";

const DefaultPlaceholders = [
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
const MaxPlaceholderLength = 80;

interface PickedMedia {
  uri: string;
  type: BlockType;
  contentType?: MimeType;
  assetId?: string | null;
}

export function TextForageView({ collectionId }: { collectionId?: string }) {
  const [textValue, setTextValue] = useState("");
  const [medias, setMedias] = useState<PickedMedia[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const { createBlocks, shareIntent, getBlocks, getCollectionItems } =
    useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();
  const { currentUser } = useContext(UserContext);
  const [textPlaceholder, setTextPlaceholder] = useState("");
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const queryKey = ["blocks", { collectionId }] as const;
  const { logError } = useContext(ErrorsContext);
  const [placeholders, setPlaceholders] =
    useState<string[]>(DefaultPlaceholders);
  const insets = useSafeAreaInsets();
  const bottomTabHeight = useBottomTabBarHeight();
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
  });
  const [messageBarKeyboardPadding, setMessageBarKeyboardPadding] = useState(0);
  const [textFocused, setTextFocused] = useState(false);
  const showCamera = getAppSetting(AppSettingType.ShowCameraInTextingView);
  const translateStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: textFocused
        ? keyboard.height.value -
          (Platform.OS === "android"
            ? messageBarKeyboardPadding
            : Platform.OS === "ios"
            ? bottomTabHeight
            : 0)
        : 0,
    };
  }, [keyboard.height, textFocused]);

  const updatePlaceholder = useCallback(() => {
    setTextPlaceholder(
      placeholders[Math.floor(Math.random() * placeholders.length)]
    );
  }, []);

  const fetchPlaceholders = useCallback(async () => {
    const promptCollection = getAppSetting(AppSettingType.PromptsCollection);
    if (promptCollection) {
      console.log("promptCollection", promptCollection);
      const collectionItems = await getCollectionItems(promptCollection, {
        page: 0,
        whereClause: `type = '${BlockType.Text}'`,
      });

      const collectionItemsText = collectionItems.map((item) =>
        item.content.length > MaxPlaceholderLength
          ? item.content.slice(0, MaxPlaceholderLength) + "..."
          : item.content
      );
      console.log("collectionItemsText", collectionItemsText);
      if (collectionItemsText.length) {
        return collectionItemsText;
      }
    }
    return DefaultPlaceholders;
  }, []);

  useEffect(() => {
    void fetchPlaceholders().then((newPlaceholders) => {
      setPlaceholders(newPlaceholders);
      setTextPlaceholder(
        newPlaceholders[Math.floor(Math.random() * newPlaceholders.length)]
      );
    });
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
    setIsLoadingAssets(true);
    // TODO: this needs to filer out ones where we've already added using assetID
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
      orderedSelection: true,
    });
    setIsLoadingAssets(false);
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
    const blocksToInsert: BlockInsertInfo[] = [];

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
            (await extractDataFromUrl(savedTextValue)) || {};
          blocksToInsert.push({
            createdBy: currentUser!.id,
            // TODO: try to capture a picture of the url always
            content: images?.[0] || favicon || "",
            title,
            description,
            source: url,
            type: BlockType.Link,
            collectionsToConnect: collectionId ? [{ collectionId }] : [],
          });
        } else {
          blocksToInsert.push({
            createdBy: currentUser!.id,
            content: savedTextValue,
            type: BlockType.Text,
            collectionsToConnect: collectionId ? [{ collectionId }] : [],
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

  async function toggleCamera() {
    if (cameraPermission) {
      if (
        cameraPermission.status === ImagePicker.PermissionStatus.UNDETERMINED ||
        (cameraPermission.status === ImagePicker.PermissionStatus.DENIED &&
          cameraPermission.canAskAgain)
      ) {
        const permission = await requestCameraPermission();
        if (permission.granted) {
          await handleLaunchCamera();
        }
      } else if (
        cameraPermission.status === ImagePicker.PermissionStatus.DENIED
      ) {
        await Linking.openSettings();
      } else {
        await handleLaunchCamera();
      }
      if (!cameraPermission) {
        const resp = await requestCameraPermission();
        if (!resp.granted) {
          alert("we need your permission to use the camera!");
          return;
        }
      }
    }
  }
  async function handleLaunchCamera() {
    setIsLoadingAssets(true);
    let result = await ImagePicker.launchCameraAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      orderedSelection: true,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.PAGE_SHEET,
    });
    setIsLoadingAssets(false);
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
  }

  return (
    <StyledView flex={1}>
      <Animated.View style={[{ flex: 1 }, translateStyle]}>
        <BlockTexts
          collectionId={collectionId}
          // TODO: types
          blocks={blocks ? blocks : null}
          fetchMoreBlocks={fetchMoreBlocks}
          isFetchingNextPage={isFetchingNextPage}
          setTextFocused={setTextFocused}
        />
        <YStack
          height="auto"
          borderTopEndRadius={4}
          borderTopStartRadius={4}
          borderRadius={4}
          elevation="$2"
          onLayout={(evt) => {
            if (messageBarKeyboardPadding > 0) {
              return;
            }
            setMessageBarKeyboardPadding(evt.nativeEvent.layout.height - 12);
          }}
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
                        videoProps={{
                          isMuted: true,
                          shouldPlay: true,
                          isLooping: true,
                        }}
                      />
                      <StyledButton
                        icon={<Icon name="remove" />}
                        size="$5"
                        theme="gray"
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
                  {isLoadingAssets && (
                    <XStack
                      paddingTop="$2"
                      alignItems="center"
                      justifyContent="center"
                      width="100%"
                    >
                      <StyledText metadata>Loading images... </StyledText>
                      <Spinner size="small" color="$orange9" />
                    </XStack>
                  )}
                </XStack>
              </ScrollView>
            )}
          </XStack>
          <XStack
            alignItems="center"
            justifyContent="center"
            padding="$2"
            gap="$2"
            position="relative"
          >
            {/* TODO: radial menu? */}
            {/* <StyledButton
              icon={
                recording ? <Icon name="stop" /> : <Icon name="microphone" />
              }
              theme="green"
              onPress={recording ? stopRecording : startRecording}
            /> */}
            <StyledButton
              icon={<Icon size={24} name="images" />}
              onPress={pickImage}
              paddingHorizontal="$1"
              theme="grey"
              chromeless
              paddingVertical={0}
            />
            {showCamera && (
              <StyledButton
                icon={<Icon size={24} name="camera" />}
                onPress={() => toggleCamera()}
                theme="grey"
                chromeless
                paddingVertical={0}
                paddingHorizontal="$1"
              ></StyledButton>
            )}
            {/* </YStack> */}
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
    </StyledView>
  );
}
