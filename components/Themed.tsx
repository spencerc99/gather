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
  title: string;
  titleStyle?: object;
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
});

export function Button(props: ButtonProps) {
  const { style, title, titleStyle, ...otherProps } = props;
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

export function Input(props: InputProps) {
  const { ...otherProps } = props;
  return <DefaultInput borderWidth={2} {...otherProps} />;
}

export function TextArea(props: TextAreaProps) {
  const { ...otherProps } = props;
  return <DefaultTextArea borderWidth={2} {...otherProps} />;
}
