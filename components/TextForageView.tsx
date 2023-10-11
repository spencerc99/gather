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

interface PickedMedia {
  uri: string;
  type: MimeType;
}

export function TextForageView({ collectionId }: { collectionId?: string }) {
  const [textValue, setTextValue] = useState("");
  const [medias, setMedias] = useState<PickedMedia[]>([]);
  const { createBlock: addBlock } = useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();

  // TODO: allow for multiple images, prob need to use something like this https://github.com/mdjfs/expo-image-multiple-picker
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setMedias([
        ...medias,
        ...result.assets.map((asset) => ({
          uri: asset.uri,
          // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
          type: asset.type === "image" ? MimeType[".png"] : MimeType[".mov"],
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

  function onSaveResult() {
    if (!textValue && !medias.length) {
      return;
    }

    if (medias.length) {
      for (const { uri, type } of medias) {
        addBlock({
          createdBy: currentUser().id,
          content: uri,
          type,
          collectionsToConnect: collectionId ? [collectionId] : [],
        });
      }
    } else {
      addBlock({
        createdBy: currentUser().id,
        content: textValue,
        type: MimeType[".txt"],
        collectionsToConnect: collectionId ? [collectionId] : [],
      });
    }

    // router.replace("/home");
    // alert(`Saved to ${selectedCollections.length} collections!`);
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
        }}
        keyboardVerticalOffset={insets.top + 96}
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
          onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
        >
          <Theme name="pink">
            <BlockTexts collectionId={collectionId} />
          </Theme>
        </ScrollView>
        <YStack
          flexGrow={1}
          borderTopWidth={1}
          borderTopEndRadius={4}
          borderTopStartRadius={4}
          paddingTop="$2"
          borderColor="$grey9"
          // boxShadow="0px -4px 4px 4px rgba(0, 0, 0, 0.4)"
          elevation="$2"
          backgroundColor="$background"
        >
          <XStack space="$1" width="100%">
            {medias.length > 0 && (
              <ScrollView horizontal={true}>
                <XStack flexWrap="wrap">
                  {medias.map(({ uri, type }, idx) => (
                    <View width={200} height={200} key={uri}>
                      <MediaView media={uri} mimeType={type} />
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
                    </View>
                  ))}
                </XStack>
              </ScrollView>
            )}
          </XStack>
          <XStack alignItems="flex-start" gap={4} width="100%" marginBottom={8}>
            {/* radial menu? */}
            <StyledButton
              icon={<Icon name="photo" />}
              onPress={pickImage}
              theme="orange"
            />
            <StyledButton
              icon={<Icon name="file" />}
              onPress={pickFile}
              theme="purple"
            />
            {/* TODO: access camera */}
            <StyledButton
              icon={
                recording ? <Icon name="stop" /> : <Icon name="microphone" />
              }
              theme="green"
              onPress={recording ? stopRecording : startRecording}
            />
          </XStack>
          <XStack alignItems="center" justifyContent="center" padding="$2">
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
              onPress={() => {
                onSaveResult();
              }}
              chromeless
              disabled={!textValue && !medias.length}
            >
              <Icon name="arrow-circle-up" theme="green" size={30} />
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

const styles = StyleSheet.create({
  parentContainer: {
    flex: 1,
    flexDirection: "column",
    paddingHorizontal: "5%",
    paddingVertical: "10%",
    height: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: "10%",
  },
  detailStepContainer: {
    display: "flex",
    alignItems: "center",
  },
  breadCrumbs: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});
