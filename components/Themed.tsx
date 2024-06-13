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
  Image,
  Label,
  Spinner,
  Input,
  H3,
} from "tamagui";
import { Link, LinkProps } from "expo-router";
import { FontAwesome, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, useColorScheme } from "react-native";
import * as FileSystem from "expo-file-system";
import { PHOTOS_FOLDER } from "../utils/blobs";
import { ensure } from "../utils/react";
import { ExternalLink } from "./ExternalLink";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useAnimatedRef } from "react-native-reanimated";

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
    size: {
      $medium: {
        height: "$3",
      },
      $small: {
        height: "$2.5",
        paddingHorizontal: "$2.5",
      },
      $tiny: {
        padding: "$1",
        height: "$1.5",
        width: "$1.5",
      },
    },
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

export function EditModeText({
  text,
  defaultText,
  textProps,
  inputProps,
  multiline,
  editing,
  setText,
}: {
  text: string | undefined;
  defaultText: string;
  inputProps?: GetProps<typeof StyledInput>;
  textProps?: GetProps<typeof StyledParagraph>;
  multiline?: boolean;
  editing: boolean;
  setText: (newText: string) => void;
}) {
  const InputComponent = multiline ? StyledTextArea : StyledInput;

  const paragraphProps = !text
    ? { placeholder: true, ...textProps }
    : { ...textProps };

  return editing ? (
    <InputComponent
      value={text}
      placeholder={defaultText}
      onChangeText={setText}
      {...inputProps}
      selectTextOnFocus
    />
  ) : (
    <StyledParagraph {...paragraphProps}>{text || defaultText}</StyledParagraph>
  );
}

export function EditableTextOnClick({
  text,
  defaultText,
  inputProps,
  multiline,
  onEdit,
  disabled,
  isEditing,
  setIsEditing,
}: {
  text: string | undefined;
  defaultText: string;
  inputProps?: GetProps<typeof StyledInput>;
  multiline?: boolean;
  onEdit: (newText: string) => void;
  disabled?: boolean;
  isEditing?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
}) {
  ensure(
    (!isEditing && !setIsEditing) || (isEditing && setIsEditing),
    "isEditing and setIsEditing must be both defined or both undefined"
  );

  const [editingInternal, setEditingInternal] = useState(false);
  const editing = isEditing ?? editingInternal;
  const setEditing = setIsEditing ?? setEditingInternal;

  const [editableContent, setEditableContent] = useState(text);
  const InputComponent = multiline ? StyledTextArea : StyledInput;

  const inputRef = useAnimatedRef<Input>();

  function commitEdit(newContent?: string | null) {
    setEditing(false);
    inputRef.current?.blur();
    if (editableContent === text) {
      // No-op so just return
      return;
    }

    if (newContent === null || newContent === undefined) {
      setEditableContent(text);
      return;
    }
    setEditableContent(newContent);
    onEdit(newContent);
  }

  const onDoubleTap = Gesture.Tap()
    .numberOfTaps(!text ? 1 : 2)
    .onStart(() => {
      "worklet";
      if (editing) {
        return;
      }

      runOnJS(setEditing)(true);
    });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <GestureDetector gesture={onDoubleTap}>
      <XStack gap="$2">
        {editing ? (
          <InputComponent
            ref={inputRef}
            value={editableContent}
            placeholder={defaultText}
            onChangeText={setEditableContent}
            pointerEvents={editing ? "auto" : "none"}
            {...inputProps}
            autogrow
            onSubmitEditing={() => commitEdit(editableContent)}
            paddingRight="$9"
            ellipse
            // TODO: padding is weird here. It doesn't animate properly when it goes from full to 0 when there is no text, so we have to manually specify a smaller padding here..
            {...{
              borderWidth: "$.5",
              padding: "$2.5",
            }}
          />
        ) : (
          <InputComponent
            ref={inputRef}
            value={editableContent}
            placeholder={defaultText}
            onChangeText={setEditableContent}
            pointerEvents="none"
            {...inputProps}
            padding={0}
            autogrow
            onSubmitEditing={() => commitEdit(editableContent)}
            ellipse
            {...{
              borderWidth: 0,
              backgroundColor: "transparent",
              minHeight: "auto",
            }}
          />
        )}
        {editing && (
          <XStack gap="$1" position="absolute" right="$1" bottom="$2">
            <StyledButton
              onPress={(e) => {
                commitEdit(null);
              }}
              circular
              theme="red"
              size="$tiny"
              icon={<Icon name="close" />}
            />
            <StyledButton
              onPress={() => {
                commitEdit(editableContent);
              }}
              circular
              theme="green"
              size="$tiny"
              icon={<Icon name="checkmark" />}
              disabled={disabled}
            />
          </XStack>
        )}
      </XStack>
    </GestureDetector>
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
    ...TextVariants,
  } as const,
});
export const StyledTextArea = styled(DefaultTextArea, {
  width: "100%",
  multiline: true,
  // TODO: once figure out how to fix the number of default lines reove this
  minHeight: 100,
});

export enum IconType {
  FontAwesomeIcon,
  Ionicons,
  FontAwesome6Icon,
}

type CustomIconType = {
  [IconType.FontAwesome6Icon]: {
    type: IconType.FontAwesome6Icon;
    name: React.ComponentProps<typeof FontAwesome6>["name"];
  };
  [IconType.FontAwesomeIcon]: {
    type: IconType.FontAwesomeIcon;
    name: keyof typeof FontAwesome.glyphMap;
  };
  [IconType.Ionicons]: {
    type: IconType.Ionicons;
    name: keyof typeof Ionicons.glyphMap;
  };
};

// TODO: fix typing
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
const CustomIcon = <T extends IconType>(
  props: Optional<
    CustomIconType[T] & Omit<GetProps<typeof Ionicons>, "type" | "name">,
    "type"
  >
) => {
  const { type = IconType.Ionicons, name, ...otherProps } = props;

  if (type === IconType.Ionicons) {
    return <Ionicons name={name} {...otherProps} />;
  } else if (type === IconType.FontAwesome6Icon) {
    return <FontAwesome6 name={name} {...otherProps} />;
  } else {
    return <FontAwesome name={name} {...otherProps} />;
  }
};

export const IconComponent = styled(CustomIcon, {
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
      clearButtonMode="always"
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
              <AlertDialog.Action asChild onPress={onPress}>
                <StyledButton theme="active">{confirmText}</StyledButton>
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
    // TODO: this is big on performance bc it blocks loading everything until resolved if its not async... figure out better way to do this.
    // maybe store the aspect ratio in database with the content? or store a cache of the aspect ratios in memory?
    new Promise(() => {
      Image.getSize(uri, (width, height) => {
        setAspectRatio(width / height);
      });
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
        resizeMode="cover"
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
        aspectRatio={aspectRatio}
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

export function ExternalLinkText({
  href,
  children,
  ...rest
}: GetProps<typeof StyledText> & { href: string }) {
  return (
    <ExternalLink href={href}>
      <StyledText link {...rest}>
        {children}
      </StyledText>
    </ExternalLink>
  );
}

export function Collapsible({
  title,
  content,
}: {
  title: string;
  content: React.ReactNode;
}) {
  const [showContent, setShowContent] = useState(false);
  return (
    <YStack>
      <H3>
        {title}
        <StyledButton
          onPress={() => setShowContent(!showContent)}
          circular
          size="$5"
          theme="white"
          backgroundColor="$gray6"
          icon={<Icon name={showContent ? "chevron-up" : "chevron-down"} />}
        ></StyledButton>
      </H3>
      {showContent && <YStack gap="$2">{content}</YStack>}
    </YStack>
  );
}

export function UserAvatar({
  profilePic,
  containerProps,
  userId,
  size = 20,
}: {
  profilePic?: string;
  containerProps?: GetProps<typeof StyledView>;
  userId: string;
  size?: number;
}) {
  return (
    <StyledView
      width={size}
      height={size}
      borderRadius={100}
      justifyContent="center"
      alignItems="center"
      backgroundColor="$gray7"
      position="relative"
      {...containerProps}
    >
      {profilePic && (
        <Image
          position="absolute"
          source={{ uri: profilePic }}
          width={size}
          height={size}
          borderRadius={100}
          zIndex={1}
        />
      )}
      <StyledText>{userId[0].toUpperCase()}</StyledText>
    </StyledView>
  );
}
