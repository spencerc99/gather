import {
  Text,
  Button as DefaultButton,
  ButtonProps,
  styled,
  View,
  Input as DefaultInput,
  TextArea as DefaultTextArea,
  GetProps,
  Stack,
  YStack,
  Paragraph,
  AlertDialog,
  XStack,
  ImageProps,
  Adapt,
  Sheet,
  Image,
  Label,
  StackProps,
  Spinner,
} from "tamagui";
import { Image as ExpoImage } from "expo-image";
import { Link, LinkProps } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, useColorScheme } from "react-native";
import * as FileSystem from "expo-file-system";
import { PHOTOS_FOLDER } from "../utils/blobs";

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
  link: {
    true: {
      color: "#2e78b7",
    },
  },
  bold: {
    true: {
      fontWeight: "700",
    },
  },
} as const;

export const StyledText = styled(Text, {
  variants: TextVariants,
});

export const StyledParagraph = styled(Paragraph, {
  variants: TextVariants,
});

export const StyledLabel = styled(Label, {
  color: "$color",
  variants: TextVariants,
});

// TODO: this doesn't properly pass down variants
export const StyledView = styled(View, {
  variants: TextVariants,
});

const PressableButton = styled(DefaultButton, {
  theme: "blue",
  backgroundColor: "$background",
  color: "$color",
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
    // Idk why all of the sudden this doesnt work lol
    chromeless: {
      true: {
        backgroundColor: "transparent",
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

// TODO: remove, consiolidate with button
export function LinkButton(props: LinkButtonProps) {
  const { href, children, ...otherProps } = props;
  return (
    // @ts-ignore
    <Link href={href} asChild={true}>
      <StyledButton {...otherProps}>{children}</StyledButton>
    </Link>
  );
}

export const StyledInput = styled(DefaultInput, {
  width: "100%",

  variants: {
    autogrow: {
      true: {
        multiline: true,
        // Handles clicking enter submitting it
        blurOnSubmit: true,
        onSubmitEditing: () => {
          Keyboard.dismiss();
        },
      },
    },
  } as const,
});
export const StyledTextArea = styled(DefaultTextArea, {
  width: "100%",
  multiline: true,
  // TODO: once figure out how to fix the number of default lines reove this
  minHeight: 150,
});

export const IconComponent = styled(FontAwesome, {
  color: "$color",
  // Background is "inherit" by default
  // TODO: 18 is not working here why????
  size: 18,
} as any);

export function Icon(props: GetProps<typeof IconComponent>) {
  return <IconComponent size={18 || props.size} {...props} />;
}

export function InputWithIcon({
  icon,
  iconSize,
  containerProps,
  ...props
}: GetProps<typeof StyledInput> & {
  icon: GetProps<typeof IconComponent>["name"];
  iconSize?: GetProps<typeof IconComponent>["size"];
  containerProps?: GetProps<typeof Stack>;
}) {
  return (
    <Stack position="relative" {...containerProps}>
      <YStack
        position="absolute"
        zIndex={1}
        left="$1.5"
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

export function SearchBarInput({
  searchValue,
  setSearchValue,
  containerProps,
  ...props
}: GetProps<typeof StyledInput> & {
  searchValue: string;
  setSearchValue: (newValue: string) => void;
  containerProps?: GetProps<typeof Stack>;
}) {
  // TODO: add clear input
  return (
    <InputWithIcon
      icon="search"
      placeholder="Search..."
      enterKeyHint="search"
      width="100%"
      backgroundColor="$gray4"
      value={searchValue}
      onChangeText={(text) => setSearchValue(text)}
      containerProps={containerProps}
      {...props}
    />
  );
}

export function ButtonWithConfirm({
  onPress,
  confirmationTitle = "Are you sure?",
  confirmationDescription,
  cancelText = "Cancel",
  confirmText = "Confirm",
  ...rest
}: ButtonProps & {
  confirmationTitle?: string;
  confirmationDescription?: string;
  cancelText?: string;
  confirmText?: string;
}) {
  // TODO: not working why
  return (
    <AlertDialog native>
      <AlertDialog.Trigger asChild>
        <StyledButton {...rest}></StyledButton>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          bordered
          elevate
          key="content"
          animation={[
            "quick",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <YStack space>
            <AlertDialog.Title>{confirmationTitle}</AlertDialog.Title>
            {confirmationDescription && (
              <AlertDialog.Description>
                {confirmationDescription}
              </AlertDialog.Description>
            )}
            <XStack space="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <StyledButton>{cancelText}</StyledButton>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <StyledButton onPress={onPress} theme="active">
                  {confirmText}
                </StyledButton>
              </AlertDialog.Action>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}

export function AspectRatioImage({
  uri: initUri,
  loadingSize = "small",
  otherProps,
}: {
  uri?: string;
  loadingSize?: "small" | "large";
  otherProps?: Omit<ImageProps, "source">;
}) {
  const [loading, setLoading] = useState(false);
  const uri = useMemo(
    () =>
      initUri && initUri.startsWith(PHOTOS_FOLDER)
        ? FileSystem.documentDirectory + initUri
        : initUri,
    [initUri]
  );
  const [aspectRatio, setAspectRatio] = useState(otherProps?.aspectRatio || 1);

  useEffect(() => {
    if (!uri) {
      setAspectRatio(1);
      return;
    }
    if (otherProps?.aspectRatio) {
      return;
    }

    Image.getSize(uri, (width, height) => {
      setAspectRatio(width / height);
    });
  }, [uri]);

  return (
    <Stack overflow="hidden">
      <Image
        source={
          uri
            ? {
                uri,
                // ...(otherProps?.width || otherProps?.height
                //   ? {
                //       width: otherProps?.width,
                //       height: otherProps?.height,
                //     }
                //   : {}),
              }
            : require("../assets/images/placeholder-image.jpg")
        }
        resizeMode="contain"
        aspectRatio={aspectRatio}
        // TODO: dont know why this keep throwing a warning in console... seems to be a valid value and
        // things break if i dont have it. Seems to be a thing with tamagui not updating the error handling
        // to the latest react-native image handling undefined width / height for the source
        width="100%"
        onLoadStart={() => {
          setLoading(true);
        }}
        onLoadEnd={() => {
          setLoading(false);
        }}
        {...otherProps}
      />
      {loading && (
        <Stack
          position="absolute"
          width="100%"
          height="100%"
          flex={1}
          alignItems="center"
          justifyContent="center"
          backgroundColor={loading ? "$gray6" : undefined}
        >
          <Spinner color="$orange9" size={loadingSize} />
        </Stack>
      )}
    </Stack>
  );
}

// export function AspectRatioImage({
//   uri: initUri,
//   otherProps,
// }: {
//   uri?: string;
//   otherProps?: ImageProps["style"];
// }) {
//   let styleProps = otherProps || {};

//   const uri = useMemo(
//     () =>
//       initUri && initUri.startsWith(PHOTOS_FOLDER)
//         ? FileSystem.documentDirectory + initUri
//         : initUri,
//     [initUri]
//   );
//   const [aspectRatio, setAspectRatio] = useState(styleProps?.aspectRatio);

//   useEffect(() => {
//     if (!uri) {
//       setAspectRatio(1);
//       return;
//     }
//     if (styleProps?.aspectRatio) {
//       return;
//     }

//     Image.getSize(uri, (width, height) => {
//       setAspectRatio(width / height);
//     });
//   }, [uri]);

//   return (
//     <ExpoImage
//       source={uri ? uri : "../assets/images/placeholder-image.jpg"}
//       contentFit="contain"
//       // TODO: neither of these are working fix...
//       // esp. that images have no width/height initially
//       // defaultSource={require("../assets/images/loading-image.gif")}
//       placeholder={require("../assets/images/loading-image.gif")}
//       aspectRatio={aspectRatio}
//       // TODO: dont know why this keep throwing a warning in console... seems to be a valid value and
//       // things break if i dont have it. Seems to be a thing with tamagui not updating the error handling
//       // to the latest react-native image handling undefined width / height for the source
//       style={{
//         width: "100%",
//       }}
//       {...styleProps}
//     />
//   );
// }

export function ArenaLogo({
  size = 18,
  style,
}: {
  size?: number;
  style?: object;
}) {
  const colorScheme = useColorScheme();

  return (
    <Image
      source={
        colorScheme === "dark"
          ? require("../assets/images/arena-inverted.png")
          : require("../assets/images/arena.png")
      }
      style={{
        width: size,
        height: size,
        ...style,
      }}
      width={size}
      height={size}
    />
  );
}
