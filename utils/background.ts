// TODO: define background task for syncing remote data
// @ts-ignore
import * as BackgroundFetch from "expo-background-fetch";
// @ts-ignore
import * as TaskManager from "expo-task-manager";
// @ts-ignore
import { ArenaSyncManagerSingleton } from "./arena";

const BACKGROUND_FETCH_TASK = "update-remote-items";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // fetch data here
    console.log("[background] fetching");
    ArenaSyncManagerSingleton.sync();
    console.log("[background] fetch done!");

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Register the task at some point in your app by providing the same name,
// and some configuration options for how the background fetch should behave
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
export async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 15, // 15 minutes
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });
}

// 3. (Optional) Unregister tasks by specifying the task name
// This will cancel any future background fetch calls that match the given name
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
export async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
