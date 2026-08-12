# Are.na background sync implementation

Gather uses Expo SDK 53's `expo-background-task` package to pull remote Are.na changes while iOS decides the app can run in the background. The task is stacked on the Expo SDK 53 upgrade and does not change local push behavior.

## Scope

The background task only pulls remote collection metadata and blocks. Foreground sync still pushes pending local blocks, connection changes, edits, and deletes because iOS does not guarantee when a background task runs.

The task requests a 12-hour minimum interval. This interval is advisory. iOS controls the actual schedule based on device state and usage.

## Shared pull runner

Foreground and background pulls call the same runner. The runner receives its network, storage, database, and clock dependencies so it can run outside React.

The runner:

- skips network work when the last complete pull is less than six hours old
- acquires a shared 30-minute lease to prevent overlapping foreground and background pulls
- advances each collection cursor immediately after that collection succeeds
- advances cursors across Gather-attributed remote uploads that are intentionally filtered from local insertion
- records the global success timestamp only after every collection completes
- releases its lease after success or failure

The background task opens its own SQLite handle and closes it when the task completes. SQLite writes use transactions and conflict-safe inserts so an interrupted or repeated pull does not duplicate blocks or connections.

## Authentication

The Are.na token remains in Secure Store with its existing accessibility policy. If iOS launches the task while the token is unavailable, the task records a `token-unavailable` skip and returns success. It does not change the token policy or retry while the device is locked.

## Foreground reconciliation

A background pull writes the same SQLite tables and cursors used by foreground sync. When the app becomes active, the database provider consumes a change marker and invalidates the affected collection and block queries.

The existing foreground fallback remains active. It skips a pull after a recent background success and performs the pull when background execution has not kept the cursor fresh.

## Diagnostics

The task stores aggregate status only:

- start and completion timestamps
- task result or error
- collections attempted and completed
- items and collections changed
- network requests
- skipped reason

It does not store tokens or response bodies.

The development route accepts `backgroundTest=1` to register and invoke Expo's debug task worker. Real iOS scheduling cannot be tested in the simulator.

## Validation

The implementation was validated with:

- 34 Jest tests, including freshness, lease, cursor, failure, and filtered-upload cases
- an Expo iOS production bundle export
- Expo iOS prebuild and CocoaPods installation
- a full Debug simulator build on iPhone 16 Pro with iOS 18.2
- native simulator SQLite tests for schema, transactions, conflict lookup, connection upsert, rollback, typed reads, conditional delete, and the background pull store
- the simulator diagnostic route, which reports the expected background-task restriction

A physical iPhone is still required to validate real scheduling and energy use. The test should compare foreground-only and background-enabled periods while tracking task launches, Are.na requests, stale-launch pulls, data correctness, and Power Profiler energy impact.
