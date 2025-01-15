import { useInfiniteQuery } from "@tanstack/react-query";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Linking, Platform, ScrollView } from "react-native";
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
import { BlockInsertInfo, LocationMetadata } from "../utils/dataTypes";
import { AppSettingType, getAppSetting } from "../app/settings";
import * as Location from "expo-location";

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
  captureTime?: number;
  location?: LocationMetadata;
}

const getLocationMetadata = async (
  latitude: number,
  longitude: number
): Promise<LocationMetadata> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const location = results[0];

    return {
      latitude,
      longitude,
      name: location.name || undefined,
      street: location.street || undefined,
      city: location.city || undefined,
      region: location.region || undefined,
      country: location.country || undefined,
    };
  } catch (error) {
    console.warn("Error getting location metadata:", error);
    return { latitude, longitude };
  }
};

const getCurrentLocationMetadata = async (): Promise<
  LocationMetadata | undefined
> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return undefined;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    return await getLocationMetadata(latitude, longitude);
  } catch (error) {
    console.warn("Error getting current location:", error);
    return undefined;
  }
};
const parseExifDate = (dateString?: string): number | undefined => {
  if (!dateString) return undefined;
  return new Date(
    dateString.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
  ).getTime();
};

const processMediaAsset = async (
  asset: ImagePicker.ImagePickerAsset
): Promise<PickedMedia> => {
  let metadata = null;
  if (asset.exif) {
    const { GPSLatitude, GPSLongitude, DateTimeOriginal } = asset.exif;

    let locationMetadata;
    if (GPSLatitude && GPSLongitude) {
      locationMetadata = await getLocationMetadata(GPSLatitude, GPSLongitude);
    }

    metadata = {
      captureTime: parseExifDate(DateTimeOriginal),
      location: locationMetadata,
    } as {
      captureTime: number;
      location: LocationMetadata;
    };
  }

  return {
    uri: asset.uri,
    type: asset.type === "image" ? BlockType.Image : BlockType.Video,
    contentType: asset.mimeType as MimeType,
    assetId: asset.assetId,
    ...metadata,
  };
};

export function TextForageView({ collectionId }: { collectionId?: string }) {
  const [textValue, setTextValue] = useState("");
  const [medias, setMedias] = useState<PickedMedia[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const {
    createBlocks,
    shareIntent,
    getBlocks,
    getCollectionItems,
    getExistingAssetIds,
  } = useContext(DatabaseContext);
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

  const pickImage = async () => {
    setIsLoadingAssets(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
      orderedSelection: true,
      exif: true,
    });

    if (!result.canceled) {
      const mediaWithMetadata = await Promise.all(
        result.assets.map(processMediaAsset)
      );

      setMedias([...medias, ...mediaWithMetadata]);
    }
    setIsLoadingAssets(false);
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
          savedMedias.map(
            async ({
              uri,
              type,
              assetId,
              contentType,
              captureTime,
              location,
            }) => {
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
                captureTime,
                location,
              };
            }
          )
        );
        blocksToInsert.push(...mediaToInsert);
      }

      if (savedTextValue) {
        // TODO: do this check after insert as text value and then do an update to make it super fast.
        const locationMetadata = await getCurrentLocationMetadata();
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
            location: locationMetadata,
          });
        } else {
          blocksToInsert.push({
            createdBy: currentUser!.id,
            content: savedTextValue,
            type: BlockType.Text,
            collectionsToConnect: collectionId ? [{ collectionId }] : [],
            location: locationMetadata,
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
      exif: true,
    });

    if (!result.canceled) {
      const mediaWithMetadata = await Promise.all(
        result.assets.map(processMediaAsset)
      );

      setMedias([...medias, ...mediaWithMetadata]);
    }
    setIsLoadingAssets(false);
  }

  const [existingMedias, setExistingMedias] = useState<Set<string>>(new Set());

  async function checkExistingMedias(): Promise<Set<string>> {
    const existingMedias = await getExistingAssetIds(
      medias.map(({ assetId }) => assetId)
    );

    return new Set(existingMedias);
  }

  useEffect(() => {
    void checkExistingMedias().then(setExistingMedias);
  }, [medias]);

  if (!currentUser) {
    return null;
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
                  {medias.map(({ uri, type, assetId }, idx) => {
                    const isExisting = existingMedias.has(assetId || "");
                    return (
                      <YStack
                        width={150}
                        height={150}
                        key={uri}
                        borderRadius={8}
                        overflow="hidden" // Add this to ensure the overlay stays within bounds
                      >
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
                        {isExisting && (
                          <YStack
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            backgroundColor="$gray5"
                            opacity={0.7}
                            justifyContent="center"
                            alignItems="center"
                          >
                            <StyledText>duplicate asset!</StyledText>
                          </YStack>
                        )}
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
                    );
                  })}
                </XStack>
              </ScrollView>
            )}
            {isLoadingAssets && (
              <XStack
                paddingTop="$2"
                alignItems="center"
                justifyContent="center"
                width="100%"
                {...(medias.length > 0
                  ? {
                      position: "absolute",
                      top: -4,
                    }
                  : {})}
              >
                <XStack backgroundColor="$gray4" padding="$2" borderRadius="$2">
                  <StyledText metadata>Loading images... </StyledText>
                  <Spinner size="small" color="$orange9" />
                </XStack>
              </XStack>
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
                  if (existingMedias.size > 0) {
                    Alert.alert(
                      "Duplicate Media",
                      "You've already added some of this media. Are you sure you want to add it again?",
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: "Add Anyway",
                          onPress: () => onSaveResult(),
                        },
                      ]
                    );
                  } else {
                    onSaveResult();
                  }
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
