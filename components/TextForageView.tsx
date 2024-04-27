import {
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { StyledButton, StyledTextArea, Icon, IconType } from "./Themed";
import { XStack, YStack } from "tamagui";
import { useContext, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { DatabaseContext } from "../utils/db";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import { MediaView } from "./MediaView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserContext } from "../utils/user";
import { BlockTexts } from "./BlockTexts";
import { getFsPathForMediaResult } from "../utils/blobs";
import { extractDataFromUrl, isUrl } from "../utils/url";
import { BlockType } from "../utils/mimeTypes";
import { FeedView } from "./FeedView";

const Placeholders = [
  "Who do you love and why?",
  "What was the last link you sent?",
  "What texture did you last pick up in your camera roll?",
  "What was the last interesting thing you overhead?",
  "What do you want to remember?",
  "What caught your eye about the world today?",
  "What are you grateful for?",
  "What do you appreciate about a friend?",
  "What was your last photo of the sky?",
  "How do you describe yourself?",
  "What made you love life today?",
  "What was the last song you found that slaps?",
  "Describe the last person you saw.",
  "What words do you want to live by?.",
];

interface PickedMedia {
  uri: string;
  type: BlockType;
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
  const { createBlocks, shareIntent } = useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();
  const { currentUser } = useContext(UserContext);
  const textPlaceholder = useMemo(
    () => Placeholders[Math.floor(Math.random() * Placeholders.length)],
    []
  );
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (shareIntent !== null) {
      if (typeof shareIntent === "object") {
        setMedias([
          {
            uri: shareIntent.uri,
            type: BlockType.Image,
          },
        ]);
      } else {
        setTextValue(shareIntent);
      }
    }
  }, [shareIntent]);

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
      setMedias([
        ...medias,
        ...result.assets.map((asset) => ({
          uri: asset.uri,
          // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
          type: asset.type === "image" ? BlockType.Image : BlockType.Video,
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
          savedMedias.map(async ({ uri, type }) => {
            // TODO: this is only accounting for iphone.
            const fileUri = await getFsPathForMediaResult(
              uri,
              type === BlockType.Image ? "jpg" : "mp4"
            );
            return {
              createdBy: currentUser!.id,
              content: fileUri,
              // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
              type,
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
      console.error(err);
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
      console.error("Failed to start recording", err);
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

  return isSearching ? (
    // TODO: integrate the search directly into the chat box
    <FeedView />
  ) : (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // 'position' makes it push everything up even when the scrollview doesnt have the full height, and also you can't scroll through all of them (scrollView seems to be constrained by the viewport solely)
        // but the other ones don't properly push up the nested scrollview
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        contentContainerStyle={{
          justifyContent: "space-between",
          flex: 1,
        }}
        enabled
        // NOTE: this needs to adjust based on the height of YStack below
        // TODO: make this smaller when there is a collectionId (because tabs don't show)
        keyboardVerticalOffset={insets.top + 44}
      >
        <BlockTexts collectionId={collectionId} />
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
            gap="$2"
          >
            <StyledButton
              icon={<Icon size={24} name="images" type={IconType.Ionicons} />}
              onPress={pickImage}
              paddingHorizontal="$2"
              theme="grey"
              alignSelf="flex-end"
            />
            <StyledTextArea
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
            />
            <StyledButton
              onPress={async () => {
                void onSaveResult();
              }}
              chromeless
              paddingHorizontal="$2"
              disabled={!textValue && !medias.length}
              alignSelf="flex-end"
              icon={
                <Icon
                  name="arrow-forward-circle-sharp"
                  size={28}
                  color="$green10"
                  type={IconType.Ionicons}
                />
              }
            ></StyledButton>
          </XStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
