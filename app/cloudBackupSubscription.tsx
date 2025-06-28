import { useContext, useState } from "react";
import { Image, Platform } from "react-native";
import { H2, H3, ScrollView, Theme, XStack, YStack } from "tamagui";
import {
  StyledButton,
  StyledDefaultText,
  StyledText,
  StyledView,
  Icon,
} from "../components/Themed";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { UserContext } from "../utils/user";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cloudBackupSubscriptionManager } from "../utils/cloudBackupSubscription";
import { useRouter } from "expo-router";
import { Flower } from "../components/SlidingScalePayment";

export default function CloudBackupSubscription() {
  const { currentUser } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  useFixExpoRouter3NavigationTitle();
  const insets = useSafeAreaInsets();

  // Redirect Android users since cloud backup is iOS-only for now
  if (Platform.OS === "android") {
    return (
      <Theme name="light">
        <StyledView backgroundColor="#E3F2FD" minHeight="100%">
          <ScrollView paddingTop={insets.top} paddingBottom={insets.bottom}>
            <YStack
              minHeight="100%"
              paddingHorizontal="10%"
              gap="$4"
              justifyContent="center"
            >
              <YStack alignItems="center" gap="$3">
                <Icon name="cloud" size={60} color="#1976D2" />
                <H2 textAlign="center" color="#1976D2">
                  Cloud Backup
                </H2>
                <StyledText textAlign="center" fontSize="$5" color="#424242">
                  Coming Soon for Android
                </StyledText>
              </YStack>

              <YStack gap="$3" marginTop="$4">
                <StyledText textAlign="center" fontSize="$4" color="#424242">
                  Cloud backup is currently available for iOS only. We're
                  working on bringing this feature to Android soon.
                </StyledText>
                <StyledText textAlign="center" fontSize="$3" color="#666">
                  In the meantime, you can manually export your data from
                  Settings → Data Management → Export Data.
                </StyledText>
              </YStack>

              <YStack marginTop="$6">
                <StyledButton
                  backgroundColor="#1976D2"
                  onPress={() => router.back()}
                >
                  <StyledText color="white" bold fontSize="$5">
                    Back to Settings
                  </StyledText>
                </StyledButton>
              </YStack>
            </YStack>
          </ScrollView>
        </StyledView>
      </Theme>
    );
  }

  const isEligibleForDiscount =
    cloudBackupSubscriptionManager.isEligibleForDiscount();
  const price = isEligibleForDiscount ? "$30" : "$36";
  const originalPrice = "$36";
  const savings = isEligibleForDiscount
    ? "You're saving $6 because of your earlier contribution"
    : null;

  const handleSubscribe = async (applyDiscount: boolean) => {
    setIsLoading(true);
    try {
      await cloudBackupSubscriptionManager.purchaseSubscription(
        currentUser,
        applyDiscount,
        () => {
          // On success, go back to settings
          router.back();
        },
        (error) => {
          console.error("Subscription purchase failed:", error);
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Theme name="light">
      <StyledView
        backgroundColor="#E3F2FD" // Light blue background for cloud theme
        minHeight="100%"
      >
        <ScrollView paddingTop={insets.top} paddingBottom={insets.bottom}>
          <YStack minHeight="100%" paddingHorizontal="10%" gap="$4">
            {/* Header Section */}
            <YStack alignItems="center" gap="$3" position="relative">
              {/* Decorative clouds */}
              <Flower
                style={{
                  position: "absolute",
                  top: -40,
                  left: "10%",
                  zIndex: -1,
                  opacity: 0.7,
                }}
                startSize={20}
                endSize={35}
              />
              <Flower
                style={{
                  position: "absolute",
                  top: -20,
                  right: "15%",
                  zIndex: -1,
                  opacity: 0.5,
                }}
                startSize={15}
                endSize={25}
              />
              <Icon name="cloud" size={60} color="#1976D2" />
              <H2 textAlign="center" color="#1976D2">
                Cloud Backup
              </H2>
              <StyledText textAlign="center" fontSize="$5" color="#424242">
                Keep your data safe
              </StyledText>
            </YStack>
            {/* Features Section */}
            <YStack>
              <FeatureItem
                icon="shield"
                title="Automatic Daily Backups"
                description="Your data is safely backed up to iCloud every day"
              />
              <FeatureItem
                icon="refresh-cw"
                title="Easy Restore"
                description="Restore your complete collection on any device with one tap"
              />
            </YStack>
            {/* Pricing Section */}
            <YStack alignItems="center" gap="$3" position="relative">
              {isEligibleForDiscount && (
                <Flower
                  style={{
                    position: "absolute",
                    top: -30,
                    right: "20%",
                    zIndex: -1,
                  }}
                  startSize={15}
                  endSize={30}
                />
              )}
              <YStack alignItems="center" gap="$2">
                <XStack alignItems="center" gap="$3">
                  <H3 color="#1976D2">{price}</H3>
                  <StyledText color="#666">/ year</StyledText>
                  {isEligibleForDiscount && (
                    <YStack alignItems="center">
                      <StyledText
                        fontSize="$2"
                        color="#666"
                        textDecorationLine="line-through"
                      >
                        {originalPrice}
                      </StyledText>
                      <StyledText fontSize="$2" color="#4CAF50" bold>
                        {savings}
                      </StyledText>
                    </YStack>
                  )}
                </XStack>
                {isEligibleForDiscount && (
                  <YStack alignItems="center" gap="$1">
                    <StyledText fontSize="$3" color="#4CAF50" bold>
                      🎉 Contributor Discount!
                    </StyledText>
                    <StyledText fontSize="$2" color="#666" textAlign="center">
                      Thank you for your previous support!
                    </StyledText>
                  </YStack>
                )}
              </YStack>
            </YStack>
            {/* Personal Message */}
            <YStack gap="$3" marginTop="$2">
              <StyledText textAlign="center" fontSize="$2" color="#424242">
                Gather doesn't have ads or require a subscription, so your
                support means a lot for maintenance and continued development.
                Thank you for keeping Gather user-supported and long-term
                sustainable.
              </StyledText>
            </YStack>
            {/* Action Buttons */}
            <YStack marginTop="auto" gap="$2">
              <StyledButton
                backgroundColor="#1976D2"
                onPress={() => handleSubscribe(isEligibleForDiscount)}
                disabled={isLoading}
              >
                <StyledText color="white" bold fontSize="$5">
                  {isLoading ? "Processing..." : `Subscribe`}
                </StyledText>
              </StyledButton>
              <StyledButton
                backgroundColor="transparent"
                borderColor="#1976D2"
                borderWidth={1}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <StyledText color="#1976D2">Maybe Later</StyledText>
              </StyledButton>
              <StyledText
                fontSize="$1"
                color="#999"
                textAlign="center"
                marginTop="$2"
              >
                By subscribing, you agree to automatic renewal. Cancel anytime
                in Settings → Subscriptions.
              </StyledText>
            </YStack>
          </YStack>
        </ScrollView>
      </StyledView>
    </Theme>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <XStack alignItems="flex-start" gap="$3" padding="$3">
      <Icon name={icon} size={24} color="#1976D2" marginTop="$1" />
      <YStack flex={1} gap="$1">
        <StyledText bold fontSize="$4" color="#212121">
          {title}
        </StyledText>
        <StyledText fontSize="$3" color="#666">
          {description}
        </StyledText>
      </YStack>
    </XStack>
  );
}
