# Changelog

All notable changes to Gather will be documented in this file.

## [Unreleased]

## [1.3.5] - 2026-08-03

### Added

- **@ Mention Collections**: Type `@` in the texting view to trigger collection autocomplete. Select collections to add your content to multiple collections at once. Selected collections appear as removable chips above the input.
- **Text Feed Sorting**: Sort the texting feed by when an item was added or when it was most recently connected to any collection.

### Changed

- **Are.na Media Uploads**: Upload images and videos through the Are.na v3 presigned upload flow. Image content types and filename extensions are detected from the file bytes, including HEIC and HEIF.
- **Are.na Authentication**: Request write access when connecting an Are.na account.
- **Text as Media Title**: When uploading exactly one media file with text in the texting view, the text is now used as the title for the media file instead of creating a separate text block. This provides a more intuitive way to caption your photos and videos.
- **Android Onboarding**: The Android onboarding experience now matches iOS - the support/contribution prompt is no longer shown during initial setup. Users can contribute later after experiencing the app, via the support page or milestone prompts.
- **Collection Select UI**: Moved the "New Collection" button inline with the search bar for easier access.
- **Collection Context Indicator**: Moved collection selector from the header to near the input area. Shows "In: [collection name]" with a folder-open icon, making it clear which collection you're viewing. The @ mentioned collections appear alongside as "+" destinations.

### Fixed

- **Organize Scrolling**: Corrected three-column grid virtualization so every item remains available through the final row.
