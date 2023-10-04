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

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;

  return <DefaultText style={style} {...otherProps} />;
}

export function View(props: any) {
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

export function Button(props: ButtonProps) {
  const { style, title, children, ...otherProps } = props;
  return <PressableButton {...otherProps}>{title || children}</PressableButton>;
}

export function LinkButton(props: LinkButtonProps) {
  const { style, title, titleStyle, href, ...otherProps } = props;
  return (
    // @ts-ignore
    <Link {...otherProps} href={href} asChild={true} style={[style as any]}>
      <Button title={title} titleStyle={titleStyle} />
    </Link>
  );
}

export const Input = styled(DefaultInput, {
  width: "100%",
});
export const TextArea = styled(DefaultTextArea, {
  width: "100%",
  multiline: true,
  // TODO: once figure out how to fix the number of default lines reove this
  minHeight: 150,
});

export const StyledIcon = styled(FontAwesome, {
  color: "$color",
  // TODO: 18 is not working here why????
  size: 18,
} as any);

export function Icon(props: GetProps<typeof StyledIcon>) {
  return <StyledIcon size={18} {...props} />;
}
