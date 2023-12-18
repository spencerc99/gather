import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, LinkProps, Tabs } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Colors from "../../constants/Styles";
import { XStack, YStack, useTheme } from "tamagui";
import { IconProps } from "@expo/vector-icons/build/createIconSet";

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const leftHeaderIcons = <LeftHeaderIcons />;
  const headerIcons = <MainHeaderIcons />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Chats",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="comments" color={color} />
          ),
          headerLeft: () => leftHeaderIcons,
          headerRight: () => headerIcons,
        }}
      />
      <Tabs.Screen
        name="organize"
        options={{
          tabBarLabel: "Organize",
          headerTitle: "",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="archive" color={color} />
          ),
          headerRight: () => headerIcons,
        }}
      />
    </Tabs>
  );
}

export function LeftHeaderIcons() {
  const theme = useTheme();

  function launchSearchDialog() {}

  return (
    <XStack
      space="$4"
      paddingLeft="$3"
      alignItems="center"
      height="100%"
      marginBottom="$2"
    >
      <Pressable
        onPress={() => {
          launchSearchDialog();
        }}
      >
        {({ pressed }) => (
          <FontAwesome
            name="search"
            size={22}
            color={theme.color.get()}
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )}
      </Pressable>
    </XStack>
  );
}

export function MainHeaderIcons() {
  const theme = useTheme();

  return (
    <XStack
      space="$4"
      paddingRight="$3"
      alignItems="center"
      height="100%"
      marginBottom="$2"
    >
      <Link href="/internal" asChild>
        <Pressable>
          {({ pressed }) => (
            <FontAwesome
              name="gears"
              size={25}
              color={theme.color.get()}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>
      </Link>
      {/* <Link href="/profile/" asChild>
        <Pressable>
          {({ pressed }) => (
            <FontAwesome
              name="user"
              size={25}
              color={theme.color.get()}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>
      </Link> */}
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
