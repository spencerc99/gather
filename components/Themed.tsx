import {
  Text,
  Button as DefaultButton,
  ButtonProps,
  styled,
  View as DefaultView,
  Input as DefaultInput,
  TextArea as DefaultTextArea,
  GetProps,
  Stack,
  YStack,
  Paragraph,
} from "tamagui";

import { Link, LinkProps } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

export type LinkButtonProps = Omit<ButtonProps, "onPress"> & {} & Pick<
    LinkProps<any>,
    "href"
  >;

const TextVariants = {
  title: {
    true: {
      fontSize: "$4",
      // for some reason "bold" even though accepted by types does not work here...
      fontWeight: "700",
    },
  },
  metadata: {
    true: {
      color: "$gray9",
    },
  },
} as const;

export const StyledText = styled(Text, {
  variants: TextVariants,
});

export const StyledParagraph = styled(Paragraph, {
  variants: TextVariants,
});

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
  return <PressableButton {...props}></PressableButton>;
}

export function LinkButton(props: LinkButtonProps) {
  const { href, children, ...otherProps } = props;
  return (
    // @ts-ignore
    <Link {...otherProps} href={href} asChild={true}>
      <StyledButton>{children}</StyledButton>
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
  backgroundColor: "$background",
  // TODO: 18 is not working here why????
  size: 18,
} as any);

export function Icon(props: GetProps<typeof IconComponent>) {
  return <IconComponent size={18 || props.size} {...props} />;
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
    <Stack position="relative">
      <YStack
        position="absolute"
        left="$1"
        height="100%"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name={icon} size={iconSize} />
      </YStack>
      <StyledInput {...props} paddingLeft="$4" />
    </Stack>
  );
}
