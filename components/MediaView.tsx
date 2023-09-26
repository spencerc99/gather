import { FontAwesome } from "@expo/vector-icons";
import { MimeType } from "../utils/mimeTypes";
import { View, Text } from "./Themed";
import { Pressable, Image } from "react-native";
import { Audio } from "expo-av";
import { useState, useEffect } from "react";

export function MediaView({
  media,
  mimeType,
  style,
}: {
  media: string;
  mimeType: MimeType;
  style?: object;
}) {
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);

  async function playSound() {
    console.log("play");
    await sound?.playAsync();
    setIsPlaying(true);
  }

  async function pauseSound() {
    console.log("pause");
    await sound?.pauseAsync();
    setIsPlaying(false);
  }

  async function maybeLoadSound() {
    if (mimeType !== MimeType[".ma4"]) {
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: media },
      undefined,
      (status) => {
        if (status.isLoaded) {
          //   console.log("status: ", status);
          //   setIsPlaying(status.isPlaying);
        } else {
          if (status.error) {
            console.log(`FATAL PLAYER ERROR: ${status.error}`);
          }
        }
      }
    );
    setSound(sound);
  }

  useEffect(() => {
    void maybeLoadSound();
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  function renderMedia() {
    switch (mimeType) {
      case MimeType[".txt"]:
        return <Text>{media}</Text>;
      case MimeType[".jpeg"]:
      case MimeType[".png"]:
        return (
          <Image
            source={{ uri: media }}
            style={style ? style : { width: 200, height: 200 }}
          />
        );
      case MimeType[".ma4"]:
        return (
          <Pressable
            onPress={(e) => (isPlaying ? pauseSound() : playSound())}
            style={{
              ...style,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View>
              <FontAwesome
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="black"
              />
            </View>
          </Pressable>
        );
      default:
        return null;
    }
  }

  return renderMedia();
}
