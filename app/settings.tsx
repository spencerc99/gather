import { Label, ScrollView, Switch, XStack, YStack } from "tamagui";
import { getItem, setItem } from "../utils/mmkv";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFixExpoRouter3NavigationTitle } from "../utils/router";
import { useState, useEffect, useCallback } from "react";
import { Separator } from "tamagui";
import { StyledText } from "../components/Themed";
import { CollectionSelect } from "../components/CollectionSelect";

interface AppSettingConfig<T extends AppSettingType> {
  type: T;
  label: string;
  description?: string;
  defaultValue: AppSettingTypeToValueType[T];
  renderPicker: (config: AppSettingConfig<T>) => JSX.Element;
}

const AppSettingPrefix = "appSetting_";
export enum AppSettingType {
  ShowCameraInTextingView = "ShowCameraInTextingView",
  PromptsCollection = "PromptsCollection", // for a collection of text prompts that replace the default ones
}

interface AppSettingTypeToValueType {
  [AppSettingType.ShowCameraInTextingView]: boolean;
  [AppSettingType.PromptsCollection]: string | null;
}

export function getAppSetting<T extends AppSettingType>(
  type: T
): AppSettingTypeToValueType[T] | null {
  const key = AppSettingPrefix + type;
  return getItem<AppSettingTypeToValueType[T]>(key);
}
function setAppSetting<T extends AppSettingType>(
  type: T,
  value: AppSettingTypeToValueType[T]
) {
  const key = AppSettingPrefix + type;
  return setItem(key, value);
}

export function useAppSetting<T extends AppSettingType>(
  type: T,
  initialValue: AppSettingTypeToValueType[T]
) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    const data = getAppSetting(type);
    if (data !== null) {
      setValue(data);
    }
  }, [type]);
  const setAndPersistValue = useCallback(
    (newValue: AppSettingTypeToValueType[T]) => {
      setValue(newValue);
      setAppSetting(type, newValue);
    },
    [type]
  );
  return [value, setAndPersistValue] as const;
}

const AppSettings: Record<AppSettingType, AppSettingConfig<any>> = {
  [AppSettingType.ShowCameraInTextingView]: {
    type: AppSettingType.ShowCameraInTextingView,
    label: "Show camera in texting view",
    defaultValue: false,
    renderPicker: (
      config: AppSettingConfig<AppSettingType.ShowCameraInTextingView>
    ) => {
      const [value, setValue] = useAppSetting(
        AppSettingType.ShowCameraInTextingView,
        config.defaultValue
      );
      return (
        <Switch
          theme="blue"
          checked={value ?? config.defaultValue}
          defaultChecked={config.defaultValue}
          size="$1"
          onCheckedChange={(value) => {
            setValue(value);
          }}
          native
        >
          <Switch.Thumb />
        </Switch>
      );
    },
  },
  [AppSettingType.PromptsCollection]: {
    type: AppSettingType.PromptsCollection,
    label: "Prompts Collection",
    description:
      "Choose a collection to fill the text prompts that you see in the placeholder when gathering.",
    defaultValue: null,
    renderPicker: (config) => {
      const [value, setValue] = useAppSetting(
        AppSettingType.PromptsCollection,
        config.defaultValue
      );
      return (
        <CollectionSelect
          selectedCollection={value}
          setSelectedCollection={setValue}
          collectionPlaceholder="None"
          triggerProps={{
            width: "100%",
          }}
        ></CollectionSelect>
      );
    },
  },
};

export default function Settings() {
  const insets = useSafeAreaInsets();
  useFixExpoRouter3NavigationTitle();
  return (
    <ScrollView
      flex={1}
      paddingBottom={insets.bottom}
      paddingTop="5%"
      paddingHorizontal="5%"
    >
      <YStack backgroundColor="$background" borderRadius="$4" overflow="hidden">
        {Object.entries(AppSettings).map(([type, config], index, array) => {
          return (
            <YStack key={type}>
              <YStack paddingVertical="$3" paddingHorizontal="$5" gap="$2">
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor="$background"
                  gap="$3"
                  width="100%"
                >
                  <Label fontSize="$4" color="$color">
                    {config.label}
                  </Label>
                  {config.renderPicker(config)}
                </XStack>
                {config.description && (
                  <StyledText fontSize="$small" metadata textAlign="left">
                    {config.description}
                  </StyledText>
                )}
              </YStack>
              {index < array.length - 1 && <Separator />}
            </YStack>
          );
        })}
      </YStack>
    </ScrollView>
  );
}
