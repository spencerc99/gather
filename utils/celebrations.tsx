import { Link, router } from "expo-router";
import * as StoreReview from "expo-store-review";
import { useTotalBlockCount, useTotalCollectionCount } from "./db";
import { getItem, setItem } from "./mmkv";
import { UserContext } from "./user";
import { useCallback, useContext, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { Alert } from "react-native";
import { useContributions } from "./hooks/useContributions";

const BlockMilestones = [250, 200, 150, 80, 25];
const CollectionMilestones = [25, 10, 5];
const SupportMessage = `If you're enjoying Gather, I'd really appreciate you contributing to support development and giving it a positive review to help share it with others! As an indie app made by one person, your support means the world to me and makes continued maintenance possible.`;

interface MilestoneState {
  lastPromptDate: string | null;
  lastYearPrompted: number;
  lastBlockMilestonePrompted: number;
  lastCollectionMilestonePrompted: number;
  hasPromptedForReview: boolean;
}

export const MilestoneKey = "milestoneState";

function getMilestoneState(): MilestoneState {
  const state = getItem(MilestoneKey);
  return state
    ? state
    : {
        lastPromptDate: null,
        lastYearPrompted: 0,
        lastBlockMilestonePrompted: 0,
        lastCollectionMilestonePrompted: 0,
        hasPromptedForReview: false,
      };
}

function setMilestoneState(state: MilestoneState) {
  setItem(MilestoneKey, JSON.stringify(state));
}

export function useMilestoneCheck() {
  const { currentUser } = useContext(UserContext);
  const { data: blockCount } = useTotalBlockCount();
  const { data: collectionCount } = useTotalCollectionCount();
  const contributions = useContributions();
  const hasContributed = useMemo(
    () => (contributions?.length || 0) > 0,
    [contributions]
  );

  const checkMilestones = useCallback(async () => {
    if (
      blockCount === undefined ||
      collectionCount === undefined ||
      contributions === undefined
    )
      return;

    const today = dayjs();
    const started = currentUser?.createdAt
      ? dayjs(currentUser.createdAt)
      : today;
    const daysUsedApp = today.diff(started, "day");
    const yearsUsedApp = Math.floor(daysUsedApp / 365);

    const state = getMilestoneState();

    // Check if 7 days have passed since the last prompt
    if (
      state.lastPromptDate &&
      today.diff(dayjs(state.lastPromptDate), "day") < 7
    ) {
      return;
    }

    let message: string | null = null;
    let title = "Hope you're enjoying Gather!";

    // Check for yearly anniversary
    if (yearsUsedApp > state.lastYearPrompted) {
      message = `
Happy ${yearsUsedApp} year${
        yearsUsedApp > 1 ? "s" : ""
      } anniversary of Gather! I hope you've been enjoying your
time.
  
${SupportMessage}`;
      state.lastYearPrompted = yearsUsedApp;
    }

    if (!hasContributed) {
      // If no yearly milestone, check for block milestone
      if (!message) {
        const blockMilestone = BlockMilestones.find(
          (m) => blockCount >= m && m > state.lastBlockMilestonePrompted
        );

        if (blockMilestone) {
          message = `Congrats on creating ${blockMilestone} blocks!

${SupportMessage}`;
          state.lastBlockMilestonePrompted = blockMilestone;
        }
      }

      // If no block milestone, check for collection milestone
      if (!message) {
        const collectionMilestone = CollectionMilestones.find(
          (m) =>
            collectionCount >= m && m > state.lastCollectionMilestonePrompted
        );

        if (collectionMilestone) {
          message = `Great job on creating ${collectionMilestone} collections!

${SupportMessage}`;
          state.lastCollectionMilestonePrompted = collectionMilestone;
        }
      }
    }

    const onDismiss = async () => {
      state.lastPromptDate = today.toISOString();
      setMilestoneState(state);

      if (state.hasPromptedForReview) {
        return;
      }

      await promptForReview(false);
    };

    if (message) {
      // TODO: this should push a full-screen modal instead of an alert, same styling as AboutSection
      Alert.alert(
        title,
        message,
        [
          ...(hasContributed
            ? [
                {
                  text: "yay!",
                  style: "default" as const,
                  onPress: async () => {
                    await onDismiss();
                  },
                },
                {
                  text: "i'd like to contribute again!",
                  onPress: async () => {
                    router.push("/support");
                    await onDismiss();
                  },
                  style: "cancel" as const,
                },
              ]
            : [
                {
                  text: "i can contribute!",
                  onPress: async () => {
                    router.push("/support");
                    await onDismiss();
                  },
                  style: "cancel" as const,
                },
                {
                  text: "sorry i can't",
                  style: "default" as const,
                  onPress: async () => {
                    Alert.alert(
                      "pretty please?",
                      "This work, like all handmade software, only happens because of people like you contributing a few dollars. Together, we can make it possible to create software with data that's entirely yours and not subject to ads or adverse incentives.",
                      [
                        {
                          text: "Sorry I really can't",
                          onPress: async () => {
                            Alert.alert(
                              "That's okay",
                              "I hope you enjoy Gather and find it useful. If you change your mind, you can always contribute later in the profile tab.",
                              [
                                {
                                  text: "Thanks! I'll contribute later if I like it",
                                },
                              ],
                              { cancelable: true }
                            );
                            await onDismiss();
                          },
                          style: "default",
                        },
                        {
                          text: "Ok you've convinced me",
                          onPress: async () => {
                            router.push("/support");
                            await onDismiss();
                          },
                          style: "cancel",
                        },
                      ]
                    );
                  },
                },
              ]),
        ],
        {
          cancelable: true,
        }
      );
    }
  }, [currentUser, blockCount, collectionCount, contributions]);

  useEffect(() => {
    if (
      blockCount === undefined ||
      collectionCount === undefined ||
      contributions === undefined
    )
      return;
    checkMilestones();
  }, [checkMilestones, blockCount, collectionCount, contributions]);

  return { checkMilestones };
}

export async function promptForReview(savePromptedState: boolean = true) {
  const state = getMilestoneState();
  const isAvailable = await StoreReview.isAvailableAsync();
  if (isAvailable) {
    await StoreReview.requestReview();
    if (savePromptedState) {
      state.hasPromptedForReview = true;
      setMilestoneState(state);
    } else {
    }

    // Fallback for when StoreReview is not available
    // You might want to open the app store page manually here
    console.log("Store review not available");
  }
}
