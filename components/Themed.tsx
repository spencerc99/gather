import {
  Text as DefaultText,
  Button as DefaultButton,
  ButtonProps as DefaultButtonProps,
  styled,
  Theme,
  TextProps as DefaultTextProps,
  InputProps,
  TextAreaProps,
  View as DefaultView,
  Input as DefaultInput,
  TextArea as DefaultTextArea,
} from "tamagui";

import { Link, LinkProps } from "expo-router";

export type TextProps = DefaultTextProps;
export type ButtonProps = DefaultButtonProps & {
  title: string | React.ReactNode;
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
  const { style, title, ...otherProps } = props;
  return (
    <Theme name="blue">
      <PressableButton {...otherProps}>{title}</PressableButton>
    </Theme>
  );
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
  unstyled: false,
});
