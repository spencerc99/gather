import { Button, StyleSheet, TextInput, Image } from "react-native";
import { View, Text } from "./Themed";
import { useContext, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { DatabaseContext } from "../utils/db";
import { router } from "expo-router";
import { MimeType } from "../utils/mimeTypes";

enum Step {
  Gather,
  GatherDetail,
}

export function ForageView() {
  const [textValue, setTextValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [image, setImage] = useState<null | string>(null);
  const [mimeType, setMimeType] = useState<null | MimeType>(null);
  const [step, setStep] = useState(Step.Gather);
  const { addBlock, shareIntent } = useContext(DatabaseContext);

  const hasImageShareIntent =
    shareIntent !== null && typeof shareIntent !== "string";
  const hasTextShareIntent =
    shareIntent !== null && typeof shareIntent === "string";

  useEffect(() => {
    // TODO: handle if already has a value? store in stack or just override
    if (hasTextShareIntent && !textValue) {
      setTextValue(shareIntent);
    } else if (hasImageShareIntent && !image) {
      setImage(shareIntent.uri);
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
      setImage(result.assets[0].uri);
      // TODO: if web, need to use the file extension to determine mime type and probably add to private origin file system.
      setMimeType(
        result.assets[0].type === "image" ? MimeType[".png"] : MimeType[".mov"]
      );
    }
  };

  function onSaveResult() {
    if (!textValue && !image) {
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
            content: image!,
            type: mimeType!,
          }),
    });

    router.replace("/feed");
  }

  function renderStep() {
    switch (step) {
      case Step.Gather:
        return (
          <View style={styles.contentContainer}>
            {/* radial menu? */}
            <Text style={styles.title}>What have you collected today?</Text>
            <Button
              title="Pick an image from camera roll"
              onPress={pickImage}
            />
            {/* TODO: Add document picker */}
            {/* <Button title="Record" onPress={recordAudio} /> */}
            {image && (
              <Image
                source={{ uri: image }}
                style={{ width: 200, height: 200 }}
              />
            )}
            {/* TODO: make this autogrow like imessage input */}
            <TextInput
              placeholder="Gather..."
              multiline
              editable
              maxLength={2000}
              onChangeText={(text) => setTextValue(text)}
              value={textValue}
              style={styles.textarea}
            />

            <Button
              title="Gather"
              onPress={() => {
                onSaveResult();
                // setStep(Step.GatherDetail);
              }}
            ></Button>
            {/* TODO: access photos */}
            {/* TODO: access camera */}
          </View>
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
            <View style={styles.contentContainer}>
              <TextInput
                placeholder="title"
                multiline
                editable
                maxLength={120}
                onChangeText={(text) => setTitleValue(text)}
                value={titleValue}
                style={styles.input}
              />
              <TextInput
                placeholder="description"
                multiline
                editable
                maxLength={2000}
                onChangeText={(text) => setDescriptionValue(text)}
                value={descriptionValue}
                style={styles.textarea}
              />
              <Button
                title="Gather"
                onPress={() => {
                  setStep(Step.GatherDetail);
                }}
              ></Button>
              {/* Render basket view and animate the item going into the collection? */}
            </View>
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
  input: {
    borderWidth: 1,
    padding: 10,
    height: 40,
    width: 250,
  },
  textarea: {
    borderWidth: 1,
    padding: 10,
    margin: 10,
    height: 100,
    width: 250,
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
