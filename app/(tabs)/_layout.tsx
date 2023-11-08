import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Colors from "../../constants/Styles";
import { XStack, useTheme } from "tamagui";
import { ButtonWithConfirm, Icon } from "../../components/Themed";

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
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
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
      <Tabs.Screen
        name="feed"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
          headerRight: () => headerIcons,
        }}
      />
    </Tabs>
  );
}

export function MainHeaderIcons() {
  const theme = useTheme();

  return (
    <XStack space="$4" paddingRight="$2">
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
