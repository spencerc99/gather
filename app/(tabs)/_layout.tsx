import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, LinkProps, Tabs } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Colors from "../../constants/Styles";
import { XStack, YStack, useTheme } from "tamagui";
import { IconProps } from "@expo/vector-icons/build/createIconSet";
import { Ionicons } from "@expo/vector-icons";

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -12 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const headerIcons = <MainHeaderIcons />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: {
          // backgroundColor: "transparent",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "",
          tabBarIcon: ({ color }) => <TabBarIcon name="create" color={color} />,
          headerRight: () => headerIcons,
        }}
      />
      <Tabs.Screen
        name="organize"
        options={{
          tabBarLabel: "",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="file-tray-full" color={color} />
          ),
          headerRight: () => headerIcons,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          tabBarLabel: "",
          headerShown: false,
          // compass
          // sticky-note
          // hourglass-2
          // eercast
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="aperture" color={color} />
          ),
          headerRight: () => headerIcons,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="person-circle" color={color} />
          ),
          headerRight: () => headerIcons,
        }}
      />
    </Tabs>
  );
}

export function MainHeaderIcons() {
  const theme = useTheme();
  return null;
  return (
    <XStack
      space="$4"
      paddingRight="$3"
      alignItems="center"
      height="100%"
      marginBottom="$2"
    >
      <Link href="/feedback" asChild>
        <Pressable>
          {({ pressed }) => (
            <FontAwesome
              name="bug"
              size={25}
              color={theme.color.get()}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>
      </Link>
    </XStack>
  );
}

export function HeaderIcon({
  href,
  icon,
}: {
  href: LinkProps<any>["href"];
  icon: IconProps<any>["name"];
}) {
  const theme = useTheme();

  return (
    <YStack paddingHorizontal="$2">
      <Link href={href} asChild>
        <Pressable>
          {({ pressed }) => (
            <FontAwesome
              name={icon}
              size={25}
              color={theme.color.get()}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>
      </Link>
    </YStack>
  );
}
