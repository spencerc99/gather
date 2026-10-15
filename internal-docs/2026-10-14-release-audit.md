# Release audit: October 14, 2026

Public distribution remains version 1.3.7. Apple accepted 1.3.8 build 9 for TestFlight on September 15. Build 9 does not contain the fixes from this audit. No new binary was submitted during this audit.

## Integrated work

- PR #50: Expo SDK 53 and direct SQLite query migration. Block batches now await each exclusive write transaction; parallel per-block writers reproduced `SQLITE_BUSY` against real SQLite.
- PR #51: background Are.na pulls. A failed channel no longer prevents later channels from importing. Partial pulls preserve successful channel cursors without advancing global freshness. Connection-only changes now invalidate affected queries.
- PR #49: local block search, reconciled with SDK 53. Bound parameters handle apostrophes and literal SQL wildcards. Search results use static media previews instead of autoplaying mounted videos.
- Organize: hold a grid item to open the focused preview. Explicit image dimensions prevent unconstrained grid media. Inactive videos show labeled play tiles; these are not generated video-frame thumbnails.
- Channel imports and bulk connections run sequentially so independent exclusive SQLite writers do not overlap within those batches.

## Verification

- Three real SQLite regressions cover batch persistence, failure ordering, and literal block search.
- The native Expo SQLite suite passed 11 checks in the iOS 18.2 simulator, including rollback, idempotent remote imports, connection-only changes, and batch ordering.
- Simulator checks confirmed block-search results and punctuation queries, visible Organize images, and hold-to-expanded-image behavior.
- TypeScript comparison against build 9 found the same 32 diagnostics with the same installed dependencies and generated route declarations. The repository-wide typecheck is not green. Existing failures include settings generics, route literals, collection/block types, Are.na response types, and website dependencies.
- Package installation and GitHub report existing dependency vulnerabilities. These require a separate dependency audit; this work does not clear them.
- Existing mocked component tests are supporting checks, not evidence of native playback or background scheduling.

## Remaining work

Apple-native photo search is being added alongside the custom saved-aware grid. The system picker opens with its search field even without full-library permission. System selection through import and saved readback still needs verification because simulator coordinate input failed inside the native picker.

Physical-device background scheduling and battery improvements remain unmeasured. A new TestFlight build is required to test this audit's changes on an iPhone. Older reply PRs #39/#41 and cloud-backup PR #42 remain separate product decisions.
