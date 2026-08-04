// ABOUTME: Verifies detection of malformed Are.na upload blocks and safe replacements.
// ABOUTME: Covers v3, GraphQL, and structured text response shapes.
import { describe, expect, it } from "@jest/globals";
import {
  ArenaUploadErrorContent,
  getArenaRecoveryCollectionInfos,
  getArenaReplacementState,
  isArenaUploadErrorBlock,
} from "./arenaRecovery";
import { RemoteSourceType } from "./dataTypes";

describe("Are.na upload error recovery", () => {
  it("detects the v3 Text block produced by the media upload error", () => {
    expect(
      isArenaUploadErrorBlock({
        type: "Text",
        state: "available",
        content: ArenaUploadErrorContent,
      }),
    ).toBe(true);
  });

  it("detects GraphQL and structured v3 text responses", () => {
    expect(
      isArenaUploadErrorBlock({
        __typename: "Text",
        content: { plain: ` ${ArenaUploadErrorContent} ` },
      }),
    ).toBe(true);
    expect(
      isArenaUploadErrorBlock({
        class: "Text",
        content: { markdown: ArenaUploadErrorContent },
      }),
    ).toBe(true);
  });

  it("does not classify ordinary text or healthy media as upload errors", () => {
    expect(
      isArenaUploadErrorBlock({
        type: "Text",
        content: "A normal note",
      }),
    ).toBe(false);
    expect(
      isArenaUploadErrorBlock({
        type: "Image",
        content: ArenaUploadErrorContent,
      }),
    ).toBe(false);
  });

  it("waits for media availability and rejects failed replacements", () => {
    expect(
      getArenaReplacementState({
        type: "PendingBlock",
        state: "processing",
      }),
    ).toBe("processing");
    expect(
      getArenaReplacementState({
        type: "Image",
        state: "available",
      }),
    ).toBe("available");
    expect(
      getArenaReplacementState({
        type: "Text",
        state: "available",
        content: ArenaUploadErrorContent,
      }),
    ).toBe("failed");
    expect(
      getArenaReplacementState({
        type: "Text",
        state: "available",
        content: "Unexpected upload response",
      }),
    ).toBe("failed");
    expect(
      getArenaReplacementState({
        type: "Image",
        state: "failed",
      }),
    ).toBe("failed");
  });

  it("preserves every local connection to a matching Are.na channel", () => {
    expect(
      getArenaRecoveryCollectionInfos([
        {
          collectionId: "1",
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: "10",
            arenaClass: "Collection",
          },
        },
        {
          collectionId: "2",
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: "20",
            arenaClass: "Collection",
          },
        },
        {
          collectionId: "3",
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: "20",
            arenaClass: "Collection",
          },
        },
        {
          collectionId: "4",
          remoteSourceType: RemoteSourceType.Arena,
          remoteSourceInfo: {
            arenaId: "99",
            arenaClass: "Block",
          },
        },
      ]),
    ).toEqual([
      { channelId: "10", collectionId: "1" },
      { channelId: "20", collectionId: "2" },
      { channelId: "20", collectionId: "3" },
    ]);
  });
});
