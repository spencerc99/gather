import { BlockType, isBlockContentVideo } from "../utils/mimeTypes";
import { StyledView, StyledText, Icon, AspectRatioImage } from "./Themed";
import { Pressable } from "react-native";
import { Audio, ResizeMode, Video } from "expo-av";
import {
  useState,
  useEffect,
  PropsWithChildren,
  useContext,
  useRef,
  useCallback,
} from "react";
import { GetProps } from "tamagui";
import { StyleProps } from "react-native-reanimated";
import { ErrorsContext } from "../utils/errors";
import { useFocusEffect } from "expo-router";

export function MediaView({
  media,
  blockType,
  alt,
  style = {},
  videoProps,
  children,
  isVisible = true,
}: PropsWithChildren<{
  media: string;
  blockType: BlockType;
  alt?: string;
  style?: StyleProps;
  videoProps?: GetProps<typeof Video>;
  isVisible?: boolean;
}>) {
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const { logError } = useContext(ErrorsContext);

  const mediaIsVideo = isBlockContentVideo(media, blockType);
  const video = useRef<Video>(null);
  const [hasClicked, setHasClicked] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  const pauseVideoOnNavigate = useCallback(() => {
    if (isVisible) {
      setShouldPlay(true);
    }

    return () => {
      setHasClicked(false);
      setShouldPlay(false);
    };
  }, []);

  useEffect(() => {
    if (!video.current) {
      return;
    }
    if (isVisible) {
      setShouldPlay(true);
    }
    if (isVisible === false) {
      setHasClicked(false);
      setShouldPlay(false);
    }
  }, [isVisible, video.current]);
  useFocusEffect(pauseVideoOnNavigate);

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
              if (!hasClicked) {
                // Unmute if it's the first time clicking
                video.current?.setIsMutedAsync(false);
              }
              setHasClicked(true);
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
              shouldPlay={shouldPlay}
              isMuted={!hasClicked ? true : undefined}
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
