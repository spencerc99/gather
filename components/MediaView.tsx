import { BlockType, isBlockContentVideo } from "../utils/mimeTypes";
import {
  StyledView,
  StyledText,
  Icon,
  AspectRatioImage,
  StyledButton,
} from "./Themed";
import { Pressable, Image } from "react-native";
import { Audio, AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import {
  useState,
  useEffect,
  PropsWithChildren,
  useContext,
  useRef,
} from "react";
import { GetProps } from "tamagui";
import Animated, { FadeIn, FadeOut, StyleProps } from "react-native-reanimated";
import { ErrorsContext } from "../utils/errors";
import { cleanUrl } from "../utils/url";

export function MediaView({
  media,
  blockType,
  alt,
  style = {},
  videoProps,
  children,
}: PropsWithChildren<{
  media: string;
  blockType: BlockType;
  alt?: string;
  style?: StyleProps;
  videoProps?: GetProps<typeof Video>;
}>) {
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const { logError } = useContext(ErrorsContext);

  const mediaIsVideo = isBlockContentVideo(media, blockType);
  const video = useRef<Video>(null);
  const [hasClicked, setHasClicked] = useState(
    videoProps?.shouldPlay ? true : false
  );

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
      case BlockType.Link:
        // TODO: handle showing this in block detail if enabling changing image
        return Boolean(media) ? (
          <AspectRatioImage
            uri={media}
            // TODO: types
            otherProps={{
              ...style,
            }}
          />
        ) : null;
      case BlockType.Image:
        return (
          <AspectRatioImage
            uri={media}
            // TODO: types
            otherProps={{
              ...style,
            }}
          />
        );
      case BlockType.Document:
        if (!mediaIsVideo) {
          return null;
        }
      case BlockType.Video:
        return (
          // @ts-ignore
          <StyledView
            onPress={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            {...style}
            overflow="hidden"
          >
            <Video
              ref={video}
              source={{ uri: media }}
              style={[
                {
                  width: "100%",
                  height: "100%",
                  minWidth: "100%",
                },
              ]}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
              {...videoProps}
            />
            {/* TODO: bring back when adding setting about autoplaying videos */}
            {/* {!hasClicked ? (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                }}
              >
                <StyledView
                  style={{
                    position: "absolute",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                  }}
                  onPress={() => {
                    video.current?.playAsync();
                    setHasClicked(true);
                  }}
                >
                  <StyledButton
                    circular
                    zIndex={10}
                    theme="gray"
                    size="$small"
                    icon={<Icon name="play" />}
                  ></StyledButton>
                </StyledView>
              </Animated.View>
            ) : null} */}
          </StyledView>
        );
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
        logError(`Unexpected BlockType ${blockType} found!`);
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
