import {
  Text as DefaultText,
  Button as DefaultButton,
  ButtonProps as DefaultButtonProps,
  styled,
  TextProps as DefaultTextProps,
  View as DefaultView,
  Input as DefaultInput,
  TextArea as DefaultTextArea,
  GetProps,
  InputFrame,
  Stack,
  YStack,
} from "tamagui";

import { Link, LinkProps } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

export type TextProps = DefaultTextProps;
export type ButtonProps = DefaultButtonProps & {
  title?: string | React.ReactNode;
};
export type LinkButtonProps = Omit<DefaultButtonProps, "onPress"> & {
  title: string;
  titleStyle?: object;
} & Pick<LinkProps<any>, "href">;

export function StyledText(props: TextProps) {
  const { style, ...otherProps } = props;

  return <DefaultText style={style} {...otherProps} />;
}

export function StyledView(props: any) {
  const { style, ...otherProps } = props;

  return <DefaultView style={style} {...otherProps} />;
}

const PressableButton = styled(DefaultButton, {
  theme: "blue",
  backgroundColor: "$background",
  // taken from https://github.com/tamagui/tamagui/issues/1156
  variants: {
    disabled: {
      true: {
        opacity: 0.5,
        pointerEvents: "none",
      },
    },
    type: {
      contained: {
        backgroundColor: "$background",
        color: "$color",
      },
      outlined: (_, { props }: { props: any }) => {
        return {
          // TODO: figure out what active is coming from
          backgroundColor: props.active
            ? "$lightColor"
            : "$backgroundSecondary",
          color: props.active ? "$color" : "$secondaryColor",
          borderColor: props.active ? "$lightColor" : "$borderColor",
        };
      },
      text: {
        borderWidth: 0,
        backgroundColor: "transparent",
        color: "$secondaryColor",
      },
    },
  } as const,

  defaultVariants: {
    type: "contained",
  },
});

export function StyledButton(props: ButtonProps) {
  const { style, title, children, ...otherProps } = props;
  return <PressableButton {...otherProps}>{title || children}</PressableButton>;
}

export function LinkButton(props: LinkButtonProps) {
  const { style, title, titleStyle, href, ...otherProps } = props;
  return (
    // @ts-ignore
    <Link {...otherProps} href={href} asChild={true} style={[style as any]}>
      <StyledButton title={title} titleStyle={titleStyle} />
    </Link>
  );
}

export const StyledInput = styled(DefaultInput, {
  width: "100%",

  variants: {} as const,
});
export const StyledTextArea = styled(DefaultTextArea, {
  width: "100%",
  multiline: true,
  // TODO: once figure out how to fix the number of default lines reove this
  minHeight: 150,
});

export const IconComponent = styled(FontAwesome, {
  color: "$color",
  // TODO: 18 is not working here why????
  size: 18,
} as any);

export function Icon(props: GetProps<typeof IconComponent>) {
  return <IconComponent size={18} {...props} />;
}

export function InputWithIcon({
  icon,
  iconSize,
  ...props
}: GetProps<typeof StyledInput> & {
  icon: GetProps<typeof IconComponent>["name"];
  iconSize?: GetProps<typeof IconComponent>["size"];
}) {
  return (
    <Stack>
      <YStack position="absolute" left="$1" height="100%">
        <Icon name={icon} size={iconSize} />
      </YStack>
      <StyledInput {...props} paddingLeft="$4" />
    </Stack>
  );
}
