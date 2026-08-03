# Are.na HEIC upload investigation

Basket's previous upload path could label original HEIC bytes as JPEG. The v3 upload path now detects the image type from its bytes before requesting an upload URL.

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

`MimeType` did not include `.heic` or `.heif`. A photo named `IMG_1234.HEIC` therefore took the JPEG fallback. The copied `.jpg` still contained HEIC bytes because `FileSystem.copyAsync` does not transcode media.

The native image picker has the same storage mismatch. It stores every picked image with a `.jpg` extension even when the picker reports a different MIME type. The upload path no longer trusts that cached extension for images.

## Additional defects in the previous upload path

### Multipart filename is not a filename

The GraphQL upload used `block.title || ""` as the multipart file `name`. A normal untitled photo was uploaded with an empty filename. A titled photo could use text with no extension.

The v3 upload generates a filename with the detected content type's extension. The block title remains display metadata.

### Processing failure is treated as synced

After creating the block, Basket performs a best-effort `getBlock` call. If that call fails, Basket stores minimal remote data and marks the block and connections synced.

Are.na processes uploaded URLs asynchronously and exposes processing states. Basket does not wait for `available` or handle `failed`. A remote processing failure can therefore become permanent locally with no automatic retry.

### The media creation path still used GraphQL

Basket obtained an S3 policy through Are.na's GraphQL API, uploaded directly to the returned bucket, then called a GraphQL block mutation. The broader Are.na integration had moved to v3, but media creation had not.

Are.na's v3 OpenAPI specification provides a public direct-upload flow:

1. `POST /v3/uploads/presign` with a filename and content type.
2. `PUT` the file bytes to the returned `upload_url` with the validated `Content-Type`.
3. `POST /v3/blocks` with the temporary S3 object URL as `value`.

Existing blocks can be added to channels with `POST /v3/connections`.

## What the Are.na fix may cover

An Are.na HEIC fix may allow correctly named and correctly typed HEIC URLs to process successfully. It does not fix:

- HEIC bytes labeled `image/jpeg`.
- HEIC bytes stored at a `.jpg` path.
- Empty or extensionless multipart filenames.
- Basket marking `processing` or `failed` blocks as synced.
- Existing failed blocks unless Are.na explicitly reprocesses them.

Existing cards should be assumed to require reprocessing or replacement until an affected block proves otherwise.

## Implemented repair

Basket now uses the documented v3 upload and creation flow:

1. Read the first bytes of local images before upload.
2. Detect JPEG, PNG, GIF, WebP, HEIC, and HEIF signatures.
3. Generate a filename whose extension matches the detected content type.
4. Request a v3 presigned upload URL.
5. Upload the original bytes with the content type returned by Are.na.
6. Create the block in its target channels through v3.
7. Connect existing Are.na blocks through v3.

This keeps the original Gather file unchanged. HEIC and HEIF are not converted because the v3 specification lists both as supported file extensions. If Are.na rejects a correctly labeled HEIC upload in live testing, add a separate JPEG upload representation after choosing an image conversion library and output quality.

The GraphQL API remains in use for channel sync and metadata operations that were outside this change.

## Remaining processing-state work

Basket still treats the block creation response as sufficient to mark the local block and connections as synced. It does not wait for the remote block to reach `available` or preserve a retryable state when Are.na reports `failed`.

Do not add polling as an isolated upload change. A safe retry design must save the remote block ID before waiting, avoid duplicate block creation, and leave failed connections eligible for retry.

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
- Upload filename.
- S3 object URL.
- Are.na block ID.
- Are.na processing state.
- Are.na `image.filename` and `image.content_type`.

The endpoint migration passes when every supported image reaches `available` and the returned filename and content type match the uploaded bytes. Processing-state retry behavior needs a separate test after its persistence design is implemented.

## Missing evidence

Obtain one or more affected Are.na block URLs. Query each block through the v3 API and compare:

- `state`
- `type`
- `image.filename`
- `image.content_type`
- `image.src`
- `created_at`

This confirms whether the reported cards came from the HEIC/JPEG mismatch, the empty filename, or another Are.na processing failure.
