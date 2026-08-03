# Are.na HEIC upload investigation

Basket can upload original HEIC bytes while labeling the file as JPEG. This is a Basket-side defect even if Are.na accepts correctly identified HEIC files.

## Reported behavior

Some Are.na image blocks display:

```text
no implicit conversion of nil into String
```

The screenshot shows the message rendered inside the failed image cards. The exact Are.na block IDs were not available during this investigation.

## Confirmed Basket upload path

The custom photo picker:

1. Reads an iOS Photos asset with `MediaLibrary.getAssetInfoAsync`.
2. Uses `info.localUri`, which Expo SDK 50 resolves from PhotoKit's `fullSizeImageURL`. This is the original full-size representation.
3. Derives MIME type from `asset.filename`.
4. Falls back to `image/jpeg` for unknown image extensions.
5. Copies every selected image to a path ending in `.jpg` without converting its bytes.
6. Uploads that file to Are.na's S3 bucket using the stored MIME type.
7. Sends the S3 URL to Are.na for asynchronous block processing.

`MimeType` does not include `.heic` or `.heif`. A photo named `IMG_1234.HEIC` therefore takes the JPEG fallback. The copied `.jpg` still contains HEIC bytes because `FileSystem.copyAsync` does not transcode media.

The native image picker has a related risk. It stores every picked image with a `.jpg` extension even when the picker reports a different MIME type.

## Additional upload defects

### Multipart filename is not a filename

The Are.na upload uses `block.title || ""` as the multipart file `name`. A normal untitled photo is uploaded with an empty filename. A titled photo may use text with no extension.

The media filename must come from the stored file path or a generated name with the correct extension. The block title is display metadata and should not determine file identity.

### Processing failure is treated as synced

After creating the block, Basket performs a best-effort `getBlock` call. If that call fails, Basket stores minimal remote data and marks the block and connections synced.

Are.na processes uploaded URLs asynchronously and exposes processing states. Basket does not wait for `available` or handle `failed`. A remote processing failure can therefore become permanent locally with no automatic retry.

### Upload contract is private

Basket obtains an S3 policy through Are.na's GraphQL API, uploads directly to the returned bucket, then calls a GraphQL block mutation. Are.na's current public v3 API documents block creation from a URL or text. It does not document this direct-upload policy flow.

The private flow may continue to work, but Basket cannot assume it has the same compatibility guarantees as the public v3 block API.

## What the Are.na fix may cover

An Are.na HEIC fix may allow correctly named and correctly typed HEIC URLs to process successfully. It does not fix:

- HEIC bytes labeled `image/jpeg`.
- HEIC bytes stored at a `.jpg` path.
- Empty or extensionless multipart filenames.
- Basket marking `processing` or `failed` blocks as synced.
- Existing failed blocks unless Are.na explicitly reprocesses them.

Existing cards should be assumed to require reprocessing or replacement until an affected block proves otherwise.

## Recommended repair

Preserve the original media in Gather and prepare a separate upload representation for Are.na:

1. Carry the original filename and extension through `PickedMedia`.
2. Store files with an extension that matches their bytes.
3. Derive MIME type from the actual file representation. Do not default unknown image bytes to JPEG.
4. For HEIC and HEIF, create a temporary JPEG upload representation. Keep the original Gather file unchanged.
5. Give the multipart file a generated filename with the upload representation's extension.
6. Create the Are.na block from the uploaded URL.
7. Poll the v3 block endpoint until the state is `available` or `failed`, with a bounded timeout.
8. Mark local connections synced only after `available`.
9. Record `failed` state and enough metadata to retry without creating duplicate blocks.

Before implementing the conversion, confirm the image library and output-quality choice. Basket does not currently depend on an image conversion package.

## Verification

Use a physical iPhone and a private test channel.

Test each path with an untitled and titled asset:

- Custom picker HEIC.
- Native picker HEIC.
- JPEG.
- PNG.
- MOV and MP4 as a regression check for the same extension issue.

For every upload, record:

- Original filename.
- Original and prepared file extensions.
- Detected and uploaded MIME types.
- Multipart filename.
- S3 object URL.
- Are.na block ID.
- Are.na processing state.
- Are.na `image.filename` and `image.content_type`.

The repair passes when every supported image reaches `available`, the returned filename and content type match the uploaded bytes, and a forced processing failure remains retryable without creating a duplicate block.

## Missing evidence

Obtain one or more affected Are.na block URLs. Query each block through the v3 API and compare:

- `state`
- `type`
- `image.filename`
- `image.content_type`
- `image.src`
- `created_at`

This confirms whether the reported cards came from the HEIC/JPEG mismatch, the empty filename, or another Are.na processing failure.
