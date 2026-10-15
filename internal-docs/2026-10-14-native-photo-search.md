# Native photo search

The custom photo picker keeps its All, Not added, and Added filters. Search Photos opens the system picker through the existing Expo ImagePicker dependency. On iOS this uses Apple's searchable Photos picker, including multiple ordered selection. No new native dependency is required.

Cancel returns to the custom grid without clearing its selection. Confirm combines the grid selection with system-picker results in order, excluding known saved or staged library identifiers. Items without identifiers remain usable through their returned file URIs. They cannot be reliably deduplicated across sessions.

The system picker does not show Gather's saved badges. Those remain in the custom grid. The composer uses its existing media conversion paths so camera behavior is unchanged.

## Verification and merge gate

Selection-merge tests cover order, saved/staged exclusions, cross-picker duplicates, and missing identifiers. Existing tests plus these tests pass: 37 tests across nine suites. The baseline typecheck comparison has no new diagnostics; the full repository still has 32 existing diagnostics with the current dependencies.

The real system picker opened in the iOS 18.2 simulator and exposed Search your library after full-library access was denied. Simulator coordinate input failed with `noWindowsAvailable` inside that picker, and it exposed no accessible elements to the control bridge. Selection through import and saved readback has not been verified. This PR remains draft until that flow passes.

Before merging, verify:

1. Select a grid item, open Search Photos, cancel, and confirm the grid selection remains.
2. Search and select a new photo and a video, confirm, save, and reopen both blocks.
3. Select an already-saved item and confirm it is excluded when a library identifier is available.
4. Repeat with limited or denied full-library access. Verify import still works, and any missing identifiers do not discard the selected media.

The feature is not in TestFlight build 9. A new binary is needed for tester distribution.
