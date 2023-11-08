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
  const theme = useTheme();

  const headerIcons = (
    <XStack space="$4" marginRight="$2">
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
      }}
    >
      {/* TODO: figure out bottom tabs */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerTitle: "",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
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
      <Tabs.Screen
        name="organize"
        options={{
          title: "Organize",
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
