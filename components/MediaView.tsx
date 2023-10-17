import { MimeType } from "../utils/mimeTypes";
import { StyledView, StyledText, Icon } from "./Themed";
import { Pressable, Image } from "react-native";
import { Audio } from "expo-av";
import { useState, useEffect, PropsWithChildren } from "react";

export function MediaView({
  media,
  mimeType,
  style,
  children,
}: PropsWithChildren<{
  media: string;
  mimeType: MimeType;
  style?: object;
}>) {
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(
    "aspectRatio" in style ? style.aspectRatio : 1
  );

  useEffect(() => {
    if (
      (mimeType !== MimeType[".jpeg"] && mimeType !== MimeType[".png"]) ||
      "aspectRatio" in style
    ) {
      return;
    }

    Image.getSize(media, (width, height) => {
      setAspectRatio(width / height);
    });
  }, [media]);

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
        return <StyledText>{media}</StyledText>;
      case MimeType[".jpeg"]:
      case MimeType[".png"]:
        return (
          <Image
            source={{ uri: media }}
            resizeMode="center"
            style={[
              {
                flex: 1,
                alignSelf: "stretch",
                aspectRatio,
                width: "100%",
                height: "auto",
                maxWidth: "100%",
                maxHeight: "100%",
              },
              style,
            ]}
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
            <StyledView>
              <Icon name={isPlaying ? "pause" : "play"} size={24} />
            </StyledView>
          </Pressable>
        );
      default:
        return null;
    }
  }

  return (
    <StyledView>
      {renderMedia()}
      {children}
    </StyledView>
  );
}
