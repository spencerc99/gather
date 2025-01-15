import { Sheet, XStack, YStack, Label, Input } from "tamagui";
import { useState, useCallback, useEffect } from "react";
import { Icon, StyledButton, StyledText } from "./Themed";
import { getItem, setItem } from "../utils/mmkv";
import DateTimeModal from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import * as Location from "expo-location";

const FilterPrefix = "blockFilter_";

export enum BlockFilterType {
  Location = "Location",
  DateRange = "DateRange",
}

interface BlockFilterTypeToValueType {
  [BlockFilterType.Location]: {
    address?: string;
    lat?: number;
    lng?: number;
  } | null;
  [BlockFilterType.DateRange]: {
    before?: Date;
    after?: Date;
  } | null;
}

interface BlockFilterConfig<T extends BlockFilterType> {
  type: T;
  label: string;
  description?: string;
  defaultValue: BlockFilterTypeToValueType[T];
  renderFilter: (config: BlockFilterConfig<T>) => JSX.Element;
}

export function getBlockFilter<T extends BlockFilterType>(
  type: T
): BlockFilterTypeToValueType[T] | null {
  const key = FilterPrefix + type;
  return getItem<BlockFilterTypeToValueType[T]>(key);
}

export function setBlockFilter<T extends BlockFilterType>(
  type: T,
  value: BlockFilterTypeToValueType[T]
): void {
  const key = FilterPrefix + type;
  setItem(key, value);
}

export function useBlockFilter<T extends BlockFilterType>(
  type: T,
  initialValue: BlockFilterTypeToValueType[T]
) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    const data = getBlockFilter(type);
    if (data !== null) {
      setValue(data);
    }
  }, [type]);

  const setAndPersistValue = useCallback(
    (newValue: BlockFilterTypeToValueType[T]) => {
      setValue(newValue);
      setBlockFilter(type, newValue);
    },
    [type]
  );

  return [value, setAndPersistValue] as const;
}

const DatePicker = ({
  value,
  onChange,
  label,
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label: string;
}) => {
  const [show, setShow] = useState(false);

  if (Platform.OS === "ios") {
    return (
      <YStack gap="$2">
        <Label>{label}</Label>
        <DateTimeModal
          value={value || new Date()}
          onCancel={() => setShow(false)}
          onConfirm={(_, date) => onChange(date)}
          mode="date"
        />
      </YStack>
    );
  }

  return (
    <YStack gap="$2">
      <StyledButton onPress={() => setShow(true)} size="$3">
        {value ? value.toLocaleDateString() : label}
      </StyledButton>
      {show && (
        <DateTimeModal
          value={value || new Date()}
          onCancel={() => setShow(false)}
          onConfirm={(_, date) => {
            setShow(false);
            if (date) onChange(date);
          }}
          mode="date"
        />
      )}
    </YStack>
  );
};

const BlockFilters: Record<BlockFilterType, BlockFilterConfig<any>> = {
  [BlockFilterType.Location]: {
    type: BlockFilterType.Location,
    label: "Location",
    description: "Filter blocks by location",
    defaultValue: null,
    renderFilter: (config) => {
      const [value, setValue] = useBlockFilter(
        BlockFilterType.Location,
        config.defaultValue
      );
      const [searchQuery, setSearchQuery] = useState("");

      const searchLocation = async (query: string) => {
        try {
          const results = await Location.geocodeAsync(query);
          if (results[0]) {
            const { latitude: lat, longitude: lng } = results[0];
            // Get readable address from coordinates
            const [address] = await Location.reverseGeocodeAsync({
              latitude: lat,
              longitude: lng,
            });
            setValue({
              address: `${address.city || ""}, ${address.region || ""}, ${
                address.country || ""
              }`.trim(),
              lat,
              lng,
            });
          }
        } catch (error) {
          console.error("Error searching location:", error);
        }
      };

      return (
        <YStack gap="$2" width="100%">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search location..."
            onSubmitEditing={() => searchLocation(searchQuery)}
          />
          {value && (
            <XStack gap="$2" alignItems="center">
              <StyledText>{value.address}</StyledText>
              <StyledButton size="$2" onPress={() => setValue(null)}>
                Clear
              </StyledButton>
            </XStack>
          )}
        </YStack>
      );
    },
  },
  [BlockFilterType.DateRange]: {
    type: BlockFilterType.DateRange,
    label: "Date Range",
    description: "Filter blocks by date range",
    defaultValue: null,
    renderFilter: (config) => {
      const [value, setValue] = useBlockFilter(
        BlockFilterType.DateRange,
        config.defaultValue
      );

      return (
        <YStack gap="$4" width="100%">
          <DatePicker
            label="After"
            value={value?.after}
            onChange={(date) => setValue((prev) => ({ ...prev, after: date }))}
          />
          <DatePicker
            label="Before"
            value={value?.before}
            onChange={(date) => setValue((prev) => ({ ...prev, before: date }))}
          />
          {(value?.before || value?.after) && (
            <StyledButton size="$2" onPress={() => setValue(null)}>
              Clear Dates
            </StyledButton>
          )}
        </YStack>
      );
    },
  },
};

export function BlockFiltersSheet() {
  const [open, setOpen] = useState(false);
  const activeFilters = Object.entries(BlockFilters).filter(([type]) => {
    const filter = getBlockFilter(type as BlockFilterType);
    return (
      filter !== null && Object.values(filter).some((v) => v !== undefined)
    );
  });

  const renderFilterPill = (type: BlockFilterType, value: any) => {
    switch (type) {
      case BlockFilterType.Location:
        return value.address;
      case BlockFilterType.DateRange:
        const parts = [];
        if (value.after)
          parts.push(`After ${value.after.toLocaleDateString()}`);
        if (value.before)
          parts.push(`Before ${value.before.toLocaleDateString()}`);
        return parts.join(", ");
      default:
        return "";
    }
  };

  return (
    <>
      <XStack gap="$2" alignItems="center">
        <StyledButton
          onPress={() => setOpen(true)}
          size="$small"
          icon={<Icon name="filter" />}
        />
        <XStack gap="$2" flexWrap="wrap">
          {activeFilters.map(([type, config]) => {
            const value = getBlockFilter(type as BlockFilterType);
            return (
              <YStack
                key={type}
                backgroundColor="$orange6"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$4"
              >
                <StyledText>
                  {renderFilterPill(type as BlockFilterType, value)}
                </StyledText>
              </YStack>
            );
          })}
        </XStack>
      </XStack>

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[70]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" paddingTop="0">
          <YStack gap="$4">
            <Sheet.Handle />
            <StyledText fontSize="$6" fontWeight="bold" paddingTop="$4">
              Filters
            </StyledText>
            {Object.entries(BlockFilters).map(([type, config]) => (
              <YStack key={type} gap="$2">
                <Label>{config.label}</Label>
                {config.renderFilter(config)}
                {config.description && (
                  <StyledText fontSize="$2" metadata>
                    {config.description}
                  </StyledText>
                )}
              </YStack>
            ))}
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
