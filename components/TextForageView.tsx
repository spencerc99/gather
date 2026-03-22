import { useInfiniteQuery } from "@tanstack/react-query";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import * as ImagePicker from "expo-image-picker";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Spinner, XStack, YStack } from "tamagui";
import { getFsPathForMediaResult } from "../utils/blobs";
import {
  BlockSelectLimit,
  DatabaseContext,
  useCollection,
  useCollections,
} from "../utils/db";
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
import {
  BlockInsertInfo,
  Collection,
  LocationMetadata,
  BlockEditInfo,
} from "../utils/dataTypes";
import { AppSettingType, getAppSetting } from "../app/settings";
import * as Location from "expo-location";
import { useLocation, LocationProvider } from "../utils/location";
import { CollectionSummary } from "./CollectionSummary";
import { CollectionSelect } from "./CollectionSelect";

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
  locationData?: LocationMetadata;
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

    const location = await Location.getCurrentPositionAsync();
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
    const {
      GPSLatitude,
      GPSLongitude,
      GPSLatitudeRef,
      GPSLongitudeRef,
      DateTimeOriginal,
    } = asset.exif;
    let locationMetadata;
    if (GPSLatitude && GPSLongitude) {
      // Apply negative values for South and West references
      const latitude = GPSLatitudeRef === "S" ? -GPSLatitude : GPSLatitude;
      const longitude = GPSLongitudeRef === "W" ? -GPSLongitude : GPSLongitude;
      locationMetadata = await getLocationMetadata(latitude, longitude);
    }

    metadata = {
      captureTime: parseExifDate(DateTimeOriginal),
      locationData: locationMetadata,
    } as {
      captureTime: number;
      locationData: LocationMetadata;
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

interface TextForageViewProps {
  collectionId?: string;
  onCollectionChange?: (collectionId: string | null) => void;
}

export function TextForageView({
  collectionId,
  onCollectionChange,
}: TextForageViewProps) {
  return (
    <LocationProvider>
      <TextForageViewContent
        collectionId={collectionId}
        onCollectionChange={onCollectionChange}
      />
    </LocationProvider>
  );
}

function TextForageViewContent({
  collectionId,
  onCollectionChange,
}: TextForageViewProps) {
  const { getLocationMetadata } = useLocation();
  const [textValue, setTextValue] = useState("");
  // Incremented on programmatic text changes (mention selection, clear, share
  // intent) to remount the textarea. Combined with defaultValue, this avoids
  // the controlled TextInput lag caused by JS bridge latency.
  const [textInputKey, setTextInputKey] = useState(0);
  const setTextValueProgrammatic = useCallback((text: string) => {
    setTextValue(text);
    setTextInputKey((k) => k + 1);
  }, []);
  const [medias, setMedias] = useState<PickedMedia[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const {
    createBlocks,
    shareIntent,
    getBlocks,
    getCollectionItems,
    getExistingAssetIds,
    updateBlock,
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

  // @ mention autocomplete state
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>(
    []
  );
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(
    null
  );
  const textInputRef = useRef<TextInput>(null);

  // Use collections hook for @ autocomplete
  const { collections: mentionCollections, isLoading: isMentionLoading } =
    useCollections({
      searchValue: mentionQuery || "",
    });

  // Filter out already selected collections AND the current "In:" collection from autocomplete
  const filteredMentionCollections = useMemo(() => {
    if (!mentionCollections) return [];
    const selectedIds = new Set(selectedCollections.map((c) => c.id));
    return mentionCollections.filter(
      (c) => !selectedIds.has(c.id) && c.id !== collectionId
    );
  }, [mentionCollections, selectedCollections, collectionId]);

  // Remove @ chip if the "In:" collection changes to one that's already selected
  useEffect(() => {
    if (
      collectionId &&
      selectedCollections.some((c) => c.id === collectionId)
    ) {
      setSelectedCollections((prev) =>
        prev.filter((c) => c.id !== collectionId)
      );
    }
  }, [collectionId]);

  // Get current collection info for "In:" indicator
  const { data: currentCollection } = useCollection(collectionId || "");

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

  // Handle text changes to detect @ mentions
  const handleTextChange = useCallback(
    (text: string) => {
      setTextValue(text);

      // Find the last @ that could be a mention trigger
      const lastAtIndex = text.lastIndexOf("@");

      if (lastAtIndex === -1) {
        // No @ found, clear mention state
        setMentionQuery(null);
        setMentionStartIndex(null);
        return;
      }

      // Check if @ is at start or preceded by whitespace (valid mention start)
      const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : " ";
      if (charBefore !== " " && charBefore !== "\n" && lastAtIndex !== 0) {
        // @ is part of a word, not a mention trigger
        setMentionQuery(null);
        setMentionStartIndex(null);
        return;
      }

      // Extract the query after @
      const query = text.slice(lastAtIndex + 1);

      // Check if query contains whitespace (mention ended)
      if (query.includes(" ") || query.includes("\n")) {
        setMentionQuery(null);
        setMentionStartIndex(null);
        return;
      }

      // Valid mention in progress
      setMentionStartIndex(lastAtIndex);
      setMentionQuery(query);
    },
    [setTextValue]
  );

  // Handle selecting a collection from autocomplete
  const handleSelectMentionCollection = useCallback(
    (collection: Collection) => {
      // Add collection to selected list
      setSelectedCollections((prev) => [...prev, collection]);

      // Remove the @query from text
      if (mentionStartIndex !== null) {
        const newText =
          textValue.slice(0, mentionStartIndex) +
          textValue.slice(mentionStartIndex + (mentionQuery?.length || 0) + 1);
        setTextValueProgrammatic(newText.trimEnd());
      }

      // Clear mention state
      setMentionQuery(null);
      setMentionStartIndex(null);
    },
    [mentionStartIndex, mentionQuery, textValue, setTextValueProgrammatic]
  );

  // Handle removing a selected collection
  const handleRemoveCollection = useCallback((collectionId: string) => {
    setSelectedCollections((prev) => prev.filter((c) => c.id !== collectionId));
  }, []);

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
        setTextValueProgrammatic(shareIntent);
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
    const savedSelectedCollections = selectedCollections;
    const blocksToInsert: BlockInsertInfo[] = [];

    // Build collections to connect from both collectionId prop and selected collections
    const collectionsToConnect = [
      ...(collectionId ? [{ collectionId }] : []),
      ...savedSelectedCollections.map((c) => ({ collectionId: c.id })),
    ];

    // If there is exactly one media file and text, use the text as the media's title
    const useTextAsMediaTitle =
      savedMedias.length === 1 && savedTextValue.trim();

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
              locationData: mediaLocationData,
            }) => {
              const fileUri = await getFsPathForMediaResult(
                uri,
                type === BlockType.Image ? "jpg" : "mp4",
                assetId
              );
              return {
                createdBy: currentUser!.id,
                content: fileUri,
                type,
                localAssetId: assetId || undefined,
                contentType,
                captureTime,
                locationData: mediaLocationData || undefined,
                // Use text as title when there's exactly one media file and text
                title: useTextAsMediaTitle ? savedTextValue.trim() : undefined,
                collectionsToConnect,
              };
            }
          )
        );
        blocksToInsert.push(...mediaToInsert);
      }

      // Only create a separate text block if we're not using text as media title
      if (savedTextValue && !useTextAsMediaTitle) {
        // Get location only when saving text (not for media)
        const locationData = savedTextValue
          ? await getLocationMetadata()
          : null;

        // Save the text block immediately
        const initialBlock = {
          createdBy: currentUser!.id,
          content: savedTextValue,
          type: BlockType.Text,
          collectionsToConnect,
          locationData: locationData || undefined,
        };
        blocksToInsert.push(initialBlock);
      }

      // Save all blocks at once
      const blockInfos = await createBlocks({
        blocksToInsert,
        collectionId: collectionId || undefined,
      });

      // Only clear the UI after successful save
      setTextValueProgrammatic("");
      setMedias([]);
      setSelectedCollections([]);
      setMentionQuery(null);
      setMentionStartIndex(null);

      // Handle URL enrichment asynchronously for text blocks
      if (savedTextValue) {
        const textBlockInfo = blockInfos.find((info, index) => {
          const block = blocksToInsert[index];
          return (
            block.type === BlockType.Text && block.content === savedTextValue
          );
        });

        if (textBlockInfo && isUrl(savedTextValue)) {
          // Do URL enrichment asynchronously without blocking
          Promise.resolve()
            .then(() => extractDataFromUrl(savedTextValue))
            .then(async (urlData) => {
              if (!urlData) return;

              const { title, description, images, url, favicon } = urlData;
              const updateInfo: BlockEditInfo = {
                type: BlockType.Link,
                content: images?.[0] || favicon || "",
                title,
                description,
                source: url,
              };

              await updateBlock({
                blockId: textBlockInfo.blockId,
                editInfo: updateInfo,
              });
            })
            .catch((err) => {
              console.warn("Error enriching URL metadata:", err);
            });
        }
      }
    } catch (err) {
      // Don't clear UI on error - keep the content so user doesn't lose it
      logError(err);
      console.error("Failed to save blocks:", err);
      // TODO: Show user-friendly error message
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
          {/* Collection Context Row: "In:" indicator + @ mention chips */}
          {(onCollectionChange || selectedCollections.length > 0) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack
                gap="$1.5"
                padding="$2"
                paddingBottom="$1"
                alignItems="center"
              >
                {/* "In:" Collection Context Indicator - styled like a chip */}
                {onCollectionChange && (
                  <CollectionSelect
                    selectedCollection={collectionId || null}
                    setSelectedCollection={onCollectionChange}
                    collectionPlaceholder="All collections"
                    triggerProps={{
                      backgroundColor: "$orange4",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: "flex-start",
                      width: "auto",
                      flexGrow: 0,
                      flexShrink: 0,
                      minHeight: 0,
                      minWidth: 0,
                      maxWidth: 240,
                    }}
                    triggerIcon={<Icon name="folder-open" size={12} />}
                    hideChevron
                  />
                )}

                {/* @ Mentioned Collections (destinations) */}
                {selectedCollections.map((collection) => (
                  <XStack
                    key={collection.id}
                    backgroundColor="$green4"
                    paddingHorizontal={8}
                    paddingVertical={4}
                    borderRadius={12}
                    alignItems="center"
                    gap={4}
                    width="auto"
                    maxWidth={240}
                  >
                    <StyledText size="$2" numberOfLines={1}>
                      {collection.title}
                    </StyledText>
                    <TouchableOpacity
                      onPress={() => handleRemoveCollection(collection.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close" size={12} />
                    </TouchableOpacity>
                  </XStack>
                ))}
              </XStack>
            </ScrollView>
          )}

          {/* Media Assets Preview */}
          <XStack gap="$1" width="100%">
            {medias.length > 0 && (
              <ScrollView horizontal={true}>
                <XStack flexWrap="wrap" gap="$2" paddingHorizontal="$2">
                  {medias.map(({ uri, type, assetId }, idx) => {
                    const isExisting = existingMedias.has(assetId || "");
                    return (
                      <YStack
                        width={150}
                        height={150}
                        key={uri}
                        borderRadius={8}
                        overflow="hidden"
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

          {/* @ Mention Autocomplete Dropdown */}
          {mentionQuery !== null && (
            <YStack
              backgroundColor="$background"
              borderTopWidth={1}
              borderColor="$gray6"
              maxHeight={200}
            >
              {isMentionLoading ? (
                <XStack padding="$2" justifyContent="center">
                  <Spinner size="small" color="$orange9" />
                </XStack>
              ) : filteredMentionCollections.length === 0 ? (
                <XStack padding="$2" justifyContent="center">
                  <StyledText metadata>
                    {mentionQuery
                      ? "No collections found"
                      : "Type to search collections"}
                  </StyledText>
                </XStack>
              ) : (
                <FlatList
                  data={filteredMentionCollections.slice(0, 5)}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="always"
                  renderItem={({ item: collection }) => (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleSelectMentionCollection(collection)}
                    >
                      <XStack
                        padding="$2"
                        paddingVertical="$1.5"
                        backgroundColor="$background"
                        borderBottomWidth={1}
                        borderColor="$gray4"
                      >
                        <StyledText numberOfLines={1} flex={1}>
                          {collection.title}
                        </StyledText>
                        <StyledText metadata>
                          {collection.itemCount} items
                        </StyledText>
                      </XStack>
                    </TouchableOpacity>
                  )}
                />
              )}
            </YStack>
          )}

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
              key={textInputKey}
              // NOTE: idk why but the padding is huge on android lol
              padding={Platform.OS === "android" ? "$2" : undefined}
              paddingRight="$6"
              placeholder={textPlaceholder}
              minHeight={undefined}
              flex={1}
              maxLength={2000}
              onChangeText={handleTextChange}
              maxHeight={Dimensions.get("window").height / 2}
              defaultValue={textValue}
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
