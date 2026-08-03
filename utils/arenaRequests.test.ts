// ABOUTME: Verifies the request payloads used to upload and create Are.na blocks.
// ABOUTME: Covers media filename selection and byte-based image type detection.
import { describe, expect, it } from "@jest/globals";
import {
  buildArenaBlockRequest,
  buildArenaConnectionRequest,
  buildArenaPresignRequest,
  detectImageContentType,
  getArenaUploadFilename,
  getArenaUploadSourceUrl,
  mapArenaConnectionBatch,
} from "./arenaRequests";

describe("Are.na upload requests", () => {
  it("builds the documented presign request", () => {
    expect(buildArenaPresignRequest("gather-42.heic", "image/heic")).toEqual({
      files: [
        {
          filename: "gather-42.heic",
          content_type: "image/heic",
        },
      ],
    });
  });

  it("uses the temporary upload URL as the block value", () => {
    expect(getArenaUploadSourceUrl("uploads/example.heic")).toBe(
      "https://s3.amazonaws.com/arena_images-temp/uploads/example.heic",
    );
  });

  it("selects the filename extension from the actual content type", () => {
    expect(getArenaUploadFilename("42", "image/heic")).toBe("gather-42.heic");
    expect(getArenaUploadFilename("42", "video/quicktime")).toBe(
      "gather-42.mov",
    );
    expect(getArenaUploadFilename("42", "image/svg+xml")).toBe(
      "gather-42.svg",
    );
    expect(getArenaUploadFilename("42", "video/x-msvideo")).toBe(
      "gather-42.avi",
    );
    expect(getArenaUploadFilename("42", "video/mpeg")).toBe(
      "gather-42.mpeg",
    );
    expect(getArenaUploadFilename("42", "video/mp2t")).toBe("gather-42.ts");
  });

  it("rejects media types that cannot produce an accurate filename", () => {
    expect(() =>
      getArenaUploadFilename("42", "application/octet-stream"),
    ).toThrow("Unsupported Are.na upload content type");
  });

  it("detects HEIC bytes even when the local filename is misleading", () => {
    const heicHeader = Uint8Array.from([
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);

    expect(detectImageContentType(heicHeader)).toBe("image/heic");
  });

  it("detects ordinary image bytes", () => {
    expect(
      detectImageContentType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    ).toBe("image/jpeg");
    expect(
      detectImageContentType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
  });
});

describe("Are.na block requests", () => {
  it("creates a block in all requested channels", () => {
    expect(
      buildArenaBlockRequest({
        value: "https://example.com/image.jpg",
        channelIds: ["10", "20"],
        title: "Example",
        description: "Description",
      }),
    ).toEqual({
      value: "https://example.com/image.jpg",
      channels: [{ id: 10 }, { id: 20 }],
      title: "Example",
      description: "Description",
    });
  });

  it("connects an existing block using the v3 connectable type", () => {
    expect(
      buildArenaConnectionRequest({
        arenaBlockId: "42",
        channelIds: ["10", "20"],
      }),
    ).toEqual({
      connectable_id: 42,
      connectable_type: "Block",
      channels: [{ id: 10 }, { id: 20 }],
    });
  });

  it("preserves connection provenance from the v3 response", () => {
    expect(
      mapArenaConnectionBatch({
        channelIds: ["10", "20"],
        connections: [
          {
            connected_at: "2026-08-03T10:01:00Z",
            connected_by: { id: 1, slug: "alice" },
          },
          {
            connected_at: "2026-08-03T10:00:00Z",
            connected_by: { id: 1, slug: "alice" },
          },
        ],
      }),
    ).toEqual({
      "10": {
        connected_at: "2026-08-03T10:01:00Z",
        user: { id: 1, slug: "alice" },
      },
      "20": {
        connected_at: "2026-08-03T10:01:00Z",
        user: { id: 1, slug: "alice" },
      },
    });
  });

  it("rejects requests beyond Are.na's 20-channel limit", () => {
    expect(() =>
      buildArenaBlockRequest({
        value: "Text",
        channelIds: Array.from({ length: 21 }, (_, index) =>
          (index + 1).toString(),
        ),
      }),
    ).toThrow("Are.na accepts at most 20 channels");
  });
});
