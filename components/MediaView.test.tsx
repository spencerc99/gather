// ABOUTME: Verifies media playback does not multiply audio resources or bypass visibility.
// ABOUTME: Protects cleanup and playback gating that keep inactive media from using energy.
import React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import { BlockType } from "../utils/mimeTypes";
import { MediaView } from "./MediaView";

const mockCreateSound = jest.fn<
  (...args: unknown[]) => Promise<{ sound: { unloadAsync: () => Promise<void> } }>
>();
const mockSetAudioMode = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUnloadSound = jest.fn<() => Promise<void>>();

jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...args),
    Sound: {
      createAsync: (...args: unknown[]) => mockCreateSound(...args),
    },
  },
  ResizeMode: { CONTAIN: "contain" },
  Video: "Video",
}));

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require("react");
    return React.useEffect(effect, [effect]);
  },
}));

jest.mock("../utils/appActivity", () => ({
  useIsAppActive: () => true,
}));

jest.mock("../utils/errors", () => {
  const React = require("react");
  return {
    ErrorsContext: React.createContext({ logError: jest.fn() }),
  };
});

jest.mock("./Themed", () => ({
  AspectRatioImage: "AspectRatioImage",
  Icon: "Icon",
  StyledText: "StyledText",
  StyledView: "StyledView",
}));

jest.mock("./PinchToZoom", () => ({
  PinchToZoom: "PinchToZoom",
}));

describe("MediaView", () => {
  it("creates one audio resource and unloads it on unmount", async () => {
    mockSetAudioMode.mockResolvedValue(undefined);
    mockUnloadSound.mockResolvedValue(undefined);
    mockCreateSound.mockResolvedValue({
      sound: { unloadAsync: mockUnloadSound },
    });

    let view: ReturnType<typeof create>;
    await act(async () => {
      view = create(<MediaView media="file.mp3" blockType={BlockType.Audio} />);
    });
    await act(async () => {});

    expect(mockCreateSound).toHaveBeenCalledTimes(1);
    expect(mockSetAudioMode).toHaveBeenCalledTimes(1);

    await act(async () => {
      view!.update(
        <MediaView media="file.mp3" blockType={BlockType.Audio} />,
      );
    });
    expect(mockCreateSound).toHaveBeenCalledTimes(1);

    act(() => view!.unmount());
    expect(mockUnloadSound).toHaveBeenCalledTimes(1);
  });

  it("does not mount hidden video resources", () => {
    let view: ReturnType<typeof create>;
    act(() => {
      view = create(
        <MediaView
          media="file.mp4"
          blockType={BlockType.Video}
          isVisible={false}
          videoProps={{ shouldPlay: true }}
        />,
      );
    });

    expect(
      view!.root.findAllByType("Video" as React.ElementType),
    ).toHaveLength(0);
    act(() => view!.unmount());
  });

  it("does not loop ordinary videos indefinitely", () => {
    let view: ReturnType<typeof create>;
    act(() => {
      view = create(
        <MediaView media="file.mp4" blockType={BlockType.Video} />,
      );
    });

    expect(
      view!.root.findByType("Video" as React.ElementType).props.isLooping,
    ).toBe(false);
    act(() => view!.unmount());
  });
});
