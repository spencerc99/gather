import {
  StyleSheet,
  KeyboardAvoidingView,
  SafeAreaView,
  Keyboard,
  ScrollView,
} from "react-native";
import { StyledButton, StyledTextArea, Icon } from "./Themed";
import { View, XStack, YStack, Theme } from "tamagui";
import { useContext, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { DatabaseContext } from "../utils/db";
import { MimeType } from "../utils/mimeTypes";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import { MediaView } from "./MediaView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { currentUser } from "../utils/user";
import { BlockTexts } from "./BlockTexts";
import { getFsPathForImageResult } from "../utils/blobs";
import { extractDataFromUrl, isUrl } from "../utils/url";

interface PickedMedia {
  uri: string;
  type: MimeType;
}

export function TextForageView({ collectionId }: { collectionId?: string }) {
  const [textValue, setTextValue] = useState("");
  const [medias, setMedias] = useState<PickedMedia[]>([]);
  const { createBlock: addBlock } = useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
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
          type: asset.type === "image" ? MimeType[".jpg"] : MimeType[".mov"],
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

    if (medias.length) {
      await Promise.all(
        medias.map(async ({ uri, type }) => {
          const fileUri = await getFsPathForImageResult(uri);
          return addBlock({
            createdBy: currentUser().id,
            content: fileUri,
            // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
            type,
            collectionsToConnect: collectionId ? [collectionId] : [],
          });
        })
      );
    }

    if (textValue) {
      if (isUrl(textValue)) {
        const { title, description, images, url, domain, favicon } =
          await extractDataFromUrl(textValue);
        await addBlock({
          createdBy: currentUser().id,
          // TODO: try to capture a picture of the url always
          content: images?.[0] || favicon || url,
          title,
          description,
          source: url,
          type: MimeType["link"],
          collectionsToConnect: collectionId ? [collectionId] : [],
        });
      } else {
        await addBlock({
          createdBy: currentUser().id,
          content: textValue,
          type: MimeType[".txt"],
          collectionsToConnect: collectionId ? [collectionId] : [],
        });
      }
    }

    setTextValue("");
    setMedias([]);
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
        type: MimeType[".ma4"],
      },
    ]);
  }

  const insets = useSafeAreaInsets();

  const scrollRef = useRef<ScrollView>(null);

  function renderStep() {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="height"
        contentContainerStyle={{
          height: "100%",
          justifyContent: "space-between",
          flex: 1,
        }}
        // NOTE: this needs to adjust based on the height of YStack below
        keyboardVerticalOffset={insets.top + 84}
      >
        <ScrollView
          style={{
            overflowY: "visible",
          }}
          onScroll={() => {
            Keyboard.dismiss();
          }}
          scrollEventThrottle={60}
          ref={scrollRef}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          <Theme name="pink">
            <BlockTexts collectionId={collectionId} />
          </Theme>
        </ScrollView>
        <YStack
          height="auto"
          borderTopWidth={1}
          borderTopEndRadius={4}
          borderTopStartRadius={4}
          borderRadius={4}
          paddingTop="$2"
          borderColor="$gray9"
          elevation="$2"
          backgroundColor="$background"
        >
          <XStack space="$1" width="100%">
            {medias.length > 0 && (
              <ScrollView horizontal={true}>
                <XStack flexWrap="wrap">
                  {medias.map(({ uri, type }, idx) => (
                    <YStack width={150} height={150} key={uri} borderRadius={8}>
                      <MediaView
                        media={uri}
                        mimeType={type}
                        style={{
                          aspectRatio: 1,
                          resizeMode: "cover",
                          borderRadius: 8,
                        }}
                      />
                      <StyledButton
                        icon={<Icon name="remove" size={12} />}
                        size="$1.5"
                        theme="red"
                        circular
                        position="absolute"
                        top={2}
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
          <XStack alignItems="flex-start" gap={4} width="100%" marginBottom={8}>
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
          </XStack>
          <XStack alignItems="center" justifyContent="center" padding="$2">
            <StyledButton
              icon={<Icon size={24} name="photo" />}
              onPress={pickImage}
              chromeless
            />
            <StyledTextArea
              placeholder="Gather..."
              minHeight={undefined}
              flex={1}
              // TODO: this dismisses the keyboard beacuse of the onscroll handler
              // onFocus={() => {
              //   scrollRef.current?.scrollToEnd({ animated: true });
              // }}
              maxLength={2000}
              onChangeText={(text) => {
                setTextValue(text);
              }}
              value={textValue}
            />
            <StyledButton
              size="$4"
              onPress={async () => {
                void onSaveResult();
              }}
              chromeless
              theme="green"
              disabled={!textValue && !medias.length}
            >
              <Icon name="arrow-circle-up" size={30} color="$green10" />
            </StyledButton>
          </XStack>
        </YStack>
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      {renderStep()}
    </SafeAreaView>
  );
}
