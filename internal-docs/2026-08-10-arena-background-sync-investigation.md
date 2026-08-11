# Are.na background sync investigation

Background sync can move a stale Are.na pull out of app launch. It will not reduce idle work by itself, and it can increase energy use if it adds network wakeups without replacing foreground requests.

## Current behavior

Basket performs two different sync workloads:

- Pushes send pending local blocks, connection changes, edits, and deletes to Are.na. Local actions schedule these pushes with a 10-second debounce. App launch also retries pending work.
- Pulls check each Are.na collection for remote changes. App launch runs a pull when the shared cursor is older than six hours. A collection detail screen can also trigger a manual pull.

The automatic pull is the only useful background candidate. Pushes should remain foreground work because iOS does not guarantee when a background task will run.

The idle performance pass removed the continuous work that motivated this investigation. In the iOS simulator, settled CPU changed from approximately 0.3–0.7% to 0.0% across 20 one-second samples. The remaining question is whether background pulls improve launch latency and let iOS coalesce network activity on a physical device.

## Existing background module

`utils/background.ts` is a dormant sketch. It cannot run in the current app:

- `expo-background-fetch` and `expo-task-manager` are not installed.
- `ArenaSyncManagerSingleton` does not exist.
- Nothing imports or registers the task.
- The task does not await the sync call.
- The task always reports new data, even when no data changed.
- The sync implementation lives inside `DatabaseProvider` and depends on mounted React contexts.

The native iOS project still declares the `fetch` background mode. This capability alone does not register or execute a task.

## SDK constraint

Basket uses Expo SDK 50. Its bundled native module map expects:

- `expo-background-fetch` `~11.8.1`
- `expo-task-manager` `~11.7.3`

Expo now recommends `expo-background-task`, which uses `BGTaskScheduler` on iOS. That package is not part of Expo SDK 50. The older `expo-background-fetch` API is deprecated in current Expo releases.

There are two implementation paths:

1. Use the SDK 50-compatible background fetch packages for a narrow experiment.
2. Upgrade Expo before adopting `expo-background-task`.

The first path isolates the sync experiment. The second path combines it with a large framework and native dependency migration. We should not combine those changes unless the Expo upgrade is already planned.

## iOS scheduling limits

iOS decides whether and when background work runs. A minimum interval is advisory, not a schedule. The system considers battery, network availability, app usage, and whether the user terminated the app.

Background execution cannot replace a foreground fallback. It can only make a later foreground pull unnecessary when a recent background pull succeeded.

Apple recommends scheduling background network activity strategically because unnecessary background launches can increase energy use. See [Reducing networking and Bluetooth power usage](https://developer.apple.com/documentation/xcode/reducing-networking-and-bluetooth-power-usage) and [BGAppRefreshTask](https://developer.apple.com/documentation/backgroundtasks/bgapprefreshtask).

Expo's [BackgroundTask documentation](https://docs.expo.dev/versions/latest/sdk/background-task/) also states that iOS background scheduling is unavailable in the simulator. Real scheduling and energy use require a physical device.

## Authentication constraint

Basket stores the Are.na token in `expo-secure-store` with the default iOS accessibility level, `WHEN_UNLOCKED`. A background task can run while the phone is locked, when that token may be unavailable.

The first experiment should treat an unavailable token as a skipped task. Changing the token to `AFTER_FIRST_UNLOCK` would make locked-device sync more reliable, but it changes the token's security policy and requires a separate decision.

## Recommended experiment

Use the SDK 50-compatible background fetch packages. Limit the first version to Are.na pulls.

### Extract the pull runner

Move the pull logic out of `DatabaseProvider` into a function that receives its dependencies explicitly:

- SQLite database
- Are.na access token
- local user ID
- error reporter
- optional cache invalidation callback

The background task must run without mounting React views. `TaskManager.defineTask` loads the JavaScript bundle, runs the global task, and shuts it down.

Keep the foreground provider as one caller of the same function. Do not maintain separate foreground and background sync implementations.

### Preserve one shared cursor

Use the existing per-channel cursors and global last-successful-sync timestamp in both execution paths.

Update the global timestamp only after every requested collection finishes successfully. The current foreground implementation updates it in a `finally` block, which can hide a failed pull for six hours.

Before making a network request, skip the task when the last successful pull is recent. A 12-hour minimum is a reasonable experiment because the latest Expo background task defaults to that interval and short iOS intervals are commonly deferred.

### Prevent overlapping runs

Use one reset-safe sync lease shared by foreground and background callers. The lease must expire after an interrupted task so a killed background process cannot block future syncs permanently.

Save each collection cursor immediately after that collection succeeds. If iOS expires the task, the next run resumes without repeating completed collections.

### Keep foreground fallback

At launch:

1. Push pending local work immediately.
2. Read the last successful pull timestamp.
3. Skip the pull when background sync completed recently.
4. Run the existing foreground pull when background execution has not succeeded within the allowed age.

This preserves correctness on devices where background refresh is disabled or rarely scheduled.

### Report accurate results

Return `NoData` when the task skips or finds no remote changes. Return `NewData` only when it adds or updates local records. Return `Failed` for a real sync failure.

Record only aggregate diagnostics:

- start and completion timestamps
- duration
- collections attempted and completed
- items added or updated
- network requests
- skipped reason
- failure category

Do not record access tokens or response bodies.

## Validation

Unit tests should cover:

- recent cursors skip all network work
- unavailable credentials skip without advancing cursors
- successful no-change pulls report `NoData`
- changed collections report `NewData`
- failed collections do not update the global success timestamp
- interrupted runs release or expire their lease
- foreground and background callers cannot overlap

Use a development build on a physical iPhone for scheduling tests. Compare at least 24 hours with foreground-only sync and 24 hours with background pull enabled.

Record:

- background task launches
- task duration and result
- total Are.na requests and bytes per day
- stale-launch pull frequency and duration
- duplicate or missing blocks
- Power Profiler energy impact

The experiment passes when foreground stale-launch work decreases, total daily requests do not increase, tasks complete within their allowed runtime, and measured device energy is neutral or better.

## Expected outcome

Background pull is likely to improve data freshness and occasional launch performance. It is not expected to improve the now-zero settled idle CPU measurement.

The energy result is unknown until physical-device testing. iOS may reduce network overhead by coalescing the pull with other system activity, or increase it by waking Basket when the user would not have opened the app. The shared cursor, a long minimum interval, and the foreground fallback are required to make that experiment safe.
