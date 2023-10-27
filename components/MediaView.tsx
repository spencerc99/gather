import { BlockType } from "../utils/mimeTypes";
import { StyledView, StyledText, Icon, AspectRatioImage } from "./Themed";
import { Pressable, Image } from "react-native";
import { Audio } from "expo-av";
import { useState, useEffect, PropsWithChildren } from "react";

export function MediaView({
  media,
  blockType,
  alt,
  style = {},
  children,
}: PropsWithChildren<{
  media: string;
  blockType: BlockType;
  alt?: string;
  style?: object;
}>) {
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
    if (blockType !== BlockType.Audio) {
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
    switch (blockType) {
      case BlockType.Text:
        return <StyledText>{media}</StyledText>;
      case BlockType.Image:
      case BlockType.Link:
        return (
          <AspectRatioImage
            uri={media}
            otherProps={{
              ...style,
            }}
          />
        );
      case BlockType.Document:
        return <StyledText>Document of {media}</StyledText>;
      // TODO: use react-native-video for this.
      case BlockType.Video:
        return <StyledText>Video of {media}</StyledText>;
      case BlockType.Audio:
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
        console.error(`Unexpected BlockType ${blockType} found!`);
        return <StyledText>Unhandled blocktype {blockType}</StyledText>;
    }
  }

  return (
    <StyledView>
      {renderMedia()}
      {children}
    </StyledView>
  );
}
