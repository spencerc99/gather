// ABOUTME: Renders image, video, audio, and document media for Gather blocks.
// ABOUTME: Limits playback to visible content while the current screen and app are active.
import { BlockType, isBlockContentVideo } from "../utils/mimeTypes";
import { StyledView, StyledText, Icon, AspectRatioImage } from "./Themed";
import { PinchToZoom } from "./PinchToZoom";
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
import { useIsAppActive } from "../utils/appActivity";

export function MediaView({
  media,
  blockType,
  alt,
  style = {},
  videoProps,
  children,
  isVisible = true,
  zoomable = false,
}: PropsWithChildren<{
  media: string;
  blockType: BlockType;
  alt?: string;
  style?: StyleProps;
  videoProps?: GetProps<typeof Video>;
  isVisible?: boolean;
  zoomable?: boolean;
}>) {
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const { logError } = useContext(ErrorsContext);

  const mediaIsVideo = isBlockContentVideo(media, blockType);
  const video = useRef<Video>(null);
  const [hasClicked, setHasClicked] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const isAppActive = useIsAppActive();
  const shouldPlay = isVisible && isScreenFocused && isAppActive;

  const trackScreenFocus = useCallback(() => {
    setIsScreenFocused(true);
    return () => {
      setIsScreenFocused(false);
      setHasClicked(false);
    };
  }, []);

  useEffect(() => {
    if (!shouldPlay) {
      setHasClicked(false);
      if (isPlaying) {
        void sound?.pauseAsync();
        setIsPlaying(false);
      }
    }
  }, [shouldPlay, isPlaying, sound]);
  useFocusEffect(trackScreenFocus);

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

  useEffect(() => {
    setSound(undefined);
    setIsPlaying(false);
    if (blockType !== BlockType.Audio) {
      return;
    }

    let disposed = false;
    let loadedSound: Audio.Sound | undefined;
    void Audio.Sound.createAsync({ uri: media })
      .then(({ sound: createdSound }) => {
        if (disposed) {
          void createdSound.unloadAsync();
          return;
        }
        loadedSound = createdSound;
        setSound(createdSound);
      })
      .catch(logError);

    return () => {
      disposed = true;
      if (loadedSound) {
        void loadedSound.unloadAsync();
      }
    };
  }, [blockType, media]);

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
      case BlockType.Image: {
        const image = (
          <AspectRatioImage
            uri={media}
            // TODO: types
            otherProps={{
              ...style,
            }}
          />
        );
        return zoomable ? <PinchToZoom>{image}</PinchToZoom> : image;
      }
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
              isMuted={!hasClicked ? true : undefined}
              {...videoProps}
              shouldPlay={shouldPlay}
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
