import { StyleSheet, Image, Pressable } from "react-native";
import { Text, Input, Button, TextArea } from "./Themed";
import { View, XStack, YStack } from "tamagui";
import { useContext, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { DatabaseContext } from "../utils/db";
import { router } from "expo-router";
import { MimeType } from "../utils/mimeTypes";
import { Audio } from "expo-av";
import { Recording } from "expo-av/build/Audio";
import { MediaView } from "./MediaView";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { CollectionSummary } from "./CollectionSummary";
import { Collection } from "../utils/dataTypes";
import { FontAwesome } from "@expo/vector-icons";

enum Step {
  Gather,
  GatherDetail,
}

export function ForageView() {
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
  } = useContext(DatabaseContext);
  const [recording, setRecording] = useState<undefined | Recording>();

  const hasImageShareIntent =
    shareIntent !== null && typeof shareIntent !== "string";
  const hasTextShareIntent =
    shareIntent !== null && typeof shareIntent === "string";

  useEffect(() => {
    // TODO: handle if already has a value? store in stack or just override
    if (hasTextShareIntent && !textValue) {
      setTextValue(shareIntent);
    } else if (hasImageShareIntent && !media) {
      setMedia(shareIntent.uri);
      setMimeType(shareIntent.mimeType as MimeType);
      setTitleValue(shareIntent.fileName);
    }
  }, [shareIntent]);

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
      source: "local",
      createdBy: "spencer-did",
      ...(textValue
        ? {
            content: textValue,
            type: MimeType[".txt"],
          }
        : {
            content: media!,
            type: mimeType!,
          }),
    });

    router.replace("/feed");
  }

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
  const sortedCollections = collections.sort((a, b) =>
    selectedCollections.includes(a.id) ? -1 : 1
  );

  function renderStep() {
    switch (step) {
      case Step.Gather:
        return (
          <KeyboardAwareScrollView
            contentContainerStyle={styles.contentContainer}
          >
            {/* radial menu? */}
            <Text style={styles.title}>What have you collected today?</Text>
            {/* TODO: make this autogrow like imessage input */}
            <TextArea
              placeholder="Gather..."
              width="100%"
              editable
              maxLength={2000}
              onChangeText={(text) => setTextValue(text)}
              value={textValue}
              style={styles.textarea}
            />
            {media && <MediaView media={media} mimeType={mimeType!} />}
            <XStack
              alignItems="flex-start"
              gap={4}
              width="100%"
              marginBottom={8}
            >
              <Button
                title={<FontAwesome size={18} name="photo" />}
                onPress={pickImage}
              />
              <Button
                title={<FontAwesome size={18} name="file" />}
                onPress={pickFile}
              />
              <Button
                title={
                  recording ? (
                    <FontAwesome size={18} name="stop" />
                  ) : (
                    <FontAwesome size={18} name="microphone" />
                  )
                }
                onPress={recording ? stopRecording : startRecording}
              />
            </XStack>
            <Button
              title="Gather"
              width="100%"
              size="$4"
              onPress={() => {
                setStep(Step.GatherDetail);
              }}
              disabled={!textValue && !media}
            ></Button>
            {/* TODO: access camera */}
          </KeyboardAwareScrollView>
        );
      case Step.GatherDetail:
        // optional enter details like title, description, etc.
        // what to do about bulk adds? maybe step by step and then skip button in top right corner
        return (
          <>
            <View style={styles.breadCrumbs}>
              <Button
                title="Back"
                onPress={() => {
                  setStep(Step.Gather);
                }}
              ></Button>
              <Button title="Skip" onPress={() => {}}></Button>
            </View>
            <YStack>
              <Input
                placeholder="title"
                multiline
                editable
                maxLength={120}
                onChangeText={(text) => setTitleValue(text)}
                value={titleValue}
              />
              <TextArea
                placeholder="description"
                multiline
                editable
                maxLength={2000}
                onChangeText={(text) => setDescriptionValue(text)}
                value={descriptionValue}
                style={styles.textarea}
              />
            </YStack>
            <KeyboardAwareScrollView
              contentContainerStyle={styles.detailStepContainer}
            >
              {sortedCollections.map((collection) => (
                <Pressable
                  onPress={() => toggleCollection(collection)}
                  style={
                    selectedCollections.includes(collection.id)
                      ? {
                          backgroundColor: "blue",
                          borderWidth: 2,
                        }
                      : {}
                  }
                >
                  <CollectionSummary collection={collection} />
                </Pressable>
              ))}
              <Button
                title="Gather"
                onPress={() => {
                  onSaveResult();
                }}
              ></Button>
              {/* Render basket view and animate the item going into the collection? */}
            </KeyboardAwareScrollView>
          </>
        );
    }
  }

  return <>{renderStep()}</>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  detailStepContainer: {
    display: "flex",
    alignItems: "center",
  },
  textarea: {
    margin: 10,
  },
  breadCrumbs: {
    position: "absolute",
    top: 0,
    left: 0,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});
