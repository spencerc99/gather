import {
  StyleSheet,
  KeyboardAvoidingView,
  SafeAreaView,
  Keyboard,
} from "react-native";
import { StyledButton, StyledTextArea, Icon } from "./Themed";
import { SizableText, View, XStack, YStack, ScrollView, Theme } from "tamagui";
import { useContext, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { DatabaseContext } from "../utils/db";
import { router } from "expo-router";
import { MimeType } from "../utils/mimeTypes";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import { MediaView } from "./MediaView";
import { Collection } from "../utils/dataTypes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { currentUser } from "../utils/user";
import { BlockTexts } from "./BlockTexts";

enum Step {
  Gather,
  // TODO: turn this into a route that is a card stack to support native navigation
  GatherDetail,
}

export function TextForageView() {
  const [textValue, setTextValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [media, setMedia] = useState<null | string>(null);
  const [mimeType, setMimeType] = useState<null | MimeType>(null);
  const [step, setStep] = useState(Step.Gather);
  const {
    createBlock: addBlock,
    shareIntent,
    collections,
    createCollection,
  } = useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();

  // TODO: allow for multiple images, prob need to use something like this https://github.com/mdjfs/expo-image-multiple-picker
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
      setMimeType(
        result.assets[0].type === "image" ? MimeType[".png"] : MimeType[".mov"]
      );
    }
  };

  const pickFile = async () => {
    // TODO: do DocumentPicker here
  };

  function onSaveResult() {
    if (!textValue && !media) {
      return;
    }

    addBlock({
      title: titleValue,
      description: descriptionValue,
      createdBy: currentUser().id,
      ...(media
        ? {
            content: media!,
            type: mimeType!,
          }
        : {
            content: textValue,
            type: MimeType[".txt"],
          }),
      collectionsToConnect: selectedCollections,
    });

    // router.replace("/home");
    // alert(`Saved to ${selectedCollections.length} collections!`);
  }

  // TODO: fix this to actually pick up the sound
  async function startRecording() {
    try {
      if (mimeType === MimeType[".ma4"]) {
        setMedia(null);
        setMimeType(null);
      }
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
    setMedia(uri);
    setMimeType(MimeType[".ma4"]);
  }

  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  function toggleCollection(collection: Collection) {
    if (selectedCollections.includes(collection.id)) {
      setSelectedCollections(
        selectedCollections.filter((id) => id !== collection.id)
      );
    } else {
      setSelectedCollections([...selectedCollections, collection.id]);
    }
  }

  // const sortedCollections = collections.sort((a, b) =>
  //   selectedCollections.includes(a.id) ? -1 : 1
  // );

  const insets = useSafeAreaInsets();

  const [searchValue, setSearchValue] = useState("");

  function renderStep() {
    switch (step) {
      case Step.Gather:
        return (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior="height"
            contentContainerStyle={{
              height: "100%",
            }}
            keyboardVerticalOffset={insets.top + 40}
          >
            <ScrollView
              style={{
                overflowY: "visible",
              }}
              onScroll={() => {
                Keyboard.dismiss();
              }}
            >
              {/* TODO: figure out how to invert this? */}
              <Theme name="blue">
                <BlockTexts />
              </Theme>
              {/* radial menu? */}
              <YStack space="$1" width="100%" alignItems="stretch">
                <XStack space="$1">
                  {media && (
                    <View width={200} height={200} marginHorizontal="auto">
                      <MediaView media={media} mimeType={mimeType!} />
                      <StyledButton
                        icon={<Icon name="remove" />}
                        circular
                        size="$1"
                        theme="red"
                        position="absolute"
                        top={2}
                        right={2}
                        onPress={() => {
                          setMedia(null);
                          setMimeType(textValue ? MimeType[".txt"] : null);
                        }}
                      />
                    </View>
                  )}
                </XStack>
              </YStack>
            </ScrollView>
            <YStack
              flexGrow={1}
              borderTopWidth={1}
              borderTopEndRadius={4}
              borderTopStartRadius={4}
              paddingTop="$2"
              borderColor="$grey9"
              boxShadow="0px 0px -4px rgba(0, 0, 0, 0.25)"
            >
              <XStack
                alignItems="flex-start"
                gap={4}
                width="100%"
                marginBottom={8}
              >
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
                    recording ? (
                      <Icon name="stop" />
                    ) : (
                      <Icon name="microphone" />
                    )
                  }
                  theme="green"
                  onPress={recording ? stopRecording : startRecording}
                />
              </XStack>
              <XStack alignItems="center" justifyContent="center">
                <StyledTextArea
                  placeholder="Gather..."
                  minHeight={undefined}
                  flex={1}
                  maxLength={2000}
                  onChangeText={(text) => {
                    setTextValue(text);
                    setMimeType(MimeType[".txt"]);
                  }}
                  value={textValue}
                  margin="$2"
                />
                <StyledButton
                  size="$2"
                  onPress={() => {
                    onSaveResult();
                  }}
                  theme="green"
                  chromeless
                  disabled={!textValue && !media}
                >
                  <Icon name="arrow-circle-up" />
                </StyledButton>
              </XStack>
            </YStack>
          </KeyboardAvoidingView>
        );
    }
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
