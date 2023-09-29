/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { useColorScheme, Pressable, PressableProps } from "react-native";
import {
  Text as DefaultText,
  View as DefaultView,
  Button as DefaultButton,
} from "tamagui";

import Colors from "../constants/Styles";
import { Link, LinkProps } from "expo-router";

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & (typeof DefaultText)["props"];
export type ViewProps = ThemeProps & (typeof DefaultView)["props"];
export type ButtonProps = ThemeProps &
  PressableProps & {
    title: string;
    titleStyle?: object;
  };
export type LinkButtonProps = ThemeProps &
  Omit<PressableProps, "onPress"> & {
    title: string;
    titleStyle?: object;
  } & Pick<LinkProps<any>, "href">;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

export function Button(props: ButtonProps) {
  const { style, lightColor, darkColor, title, titleStyle, ...otherProps } =
    props;
  const buttonStyles = useThemeColor(
    { light: lightColor, dark: darkColor },
    "button"
  );
  return (
    <DefaultButton style={[style]} {...otherProps}>
      <Text style={titleStyle}>{title}</Text>
    </DefaultButton>
  );
}

export function LinkButton(props: LinkButtonProps) {
  const {
    style,
    lightColor,
    darkColor,
    title,
    titleStyle,
    href,
    ...otherProps
  } = props;
  const buttonStyles = useThemeColor(
    { light: lightColor, dark: darkColor },
    "button"
  );
  return (
    <Link href={href} asChild style={[buttonStyles, style]} {...otherProps}>
      <Pressable>
        <Text style={titleStyle}>{title}</Text>
      </Pressable>
    </Link>
  );
}
