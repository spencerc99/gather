import { useContext, useMemo, useState } from "react";
import {
  Adapt,
  ScrollView,
  Select,
  Sheet,
  SizableText,
  SelectTriggerProps,
  YStack,
  XStack,
  useDebounceValue,
  GetProps,
  // setupNativeSheet,
} from "tamagui";
import { DatabaseContext } from "../utils/db";
import { Icon, SearchBarInput, StyledButton, StyledText } from "./Themed";
import { CreateCollectionButton } from "./CreateCollectionButton";
import { UserContext } from "../utils/user";
import { CollectionSummary } from "./CollectionSummary";
import { filterItemsBySearchValue } from "../utils/search";
// import { ModalView } from "react-native-ios-modal";

// setupNativeSheet("ios", ModalView);

export function CollectionSelect({
  selectedCollection,
  setSelectedCollection,
  collectionPlaceholder = "New collection",
  triggerProps = {},
  onTriggerSelect,
  selectProps,
  hideChevron,
}: {
  selectedCollection: string | null;
  setSelectedCollection: (selectedCollection: string | null) => void;
  collectionPlaceholder?: string;
  triggerProps?: SelectTriggerProps;
  onTriggerSelect?: () => void;
  selectProps?: GetProps<typeof Select>;
  hideChevron?: boolean;
}) {
  const { collections, createCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);
  const { currentUser: user } = useContext(UserContext);

  // sort by lastConnectedAt descending
  const sortedCollections = useMemo(
    () =>
      [...collections].sort(
        (a, b) =>
          (b.lastConnectedAt?.getTime() || b.updatedAt.getTime()) -
          (a.lastConnectedAt?.getTime() || a.updatedAt.getTime())
      ),
    [collections]
  );
  const filteredCollections = useMemo(
    () =>
      filterItemsBySearchValue(sortedCollections, debouncedSearch, [
        "title",
        "description",
      ]),
    [sortedCollections, debouncedSearch]
  );

  if (!user) {
    return;
  }

  return (
    <Select
      onValueChange={setSelectedCollection}
      // @ts-ignore
      value={selectedCollection}
      disablePreventBodyScroll
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSearchValue("");
        }
      }}
      {...selectProps}
    >
      <Select.Trigger
        elevation="$3"
        {...triggerProps}
        onPress={() => {
          onTriggerSelect?.();
        }}
      >
        <Select.Value placeholder={collectionPlaceholder} />{" "}
        {!hideChevron && (
          <Icon
            name="chevron-down"
            size={12}
            position="absolute"
            right={7}
            top="68%"
          />
        )}
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet
          modal
          animationConfig={{
            type: "spring",
            damping: 10,
            mass: 0.3,
            stiffness: 120,
          }}
          dismissOnSnapToBottom
          snapPoints={[92]}
        >
          <Sheet.Handle />
          <Sheet.Frame>
            <Adapt.Contents />
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      <Select.Content>
        <Select.Viewport minWidth={200}>
          <YStack margin="$2" marginTop="$3">
            <SearchBarInput
              backgroundColor="$gray4"
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              placeholder="Search a collection..."
            />
          </YStack>
          <Sheet.ScrollView
            contentContainerStyle={{
              // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
              paddingBottom: 24,
            }}
          >
            <XStack margin="$2" marginTop="$1" justifyContent="center">
              {searchValue ? (
                <StyledButton
                  onPress={async () => {
                    await createCollection({
                      title: searchValue,
                      createdBy: user.id,
                    });
                    setSearchValue("");
                  }}
                  noTextWrap={true}
                  height="auto"
                  paddingVertical={16}
                >
                  <SizableText
                    userSelect="none"
                    cursor="pointer"
                    color="$color"
                    size="$true"
                  >
                    New collection{" "}
                    <SizableText style={{ fontWeight: 700 }}>
                      "{searchValue}"
                    </SizableText>
                  </SizableText>
                </StyledButton>
              ) : (
                <CreateCollectionButton />
              )}
            </XStack>
            {/* TODO: add some preview about last message */}
            <Select.Group>
              {collectionPlaceholder.includes(searchValue) && (
                <Select.Item
                  index={0}
                  // @ts-ignore
                  value={null}
                  key={"none"}
                  backgroundColor={
                    selectedCollection === null ? "$green4" : undefined
                  }
                >
                  <Select.ItemText>
                    <StyledText>{collectionPlaceholder}</StyledText>
                  </Select.ItemText>
                </Select.Item>
              )}
              {filteredCollections.map((collection, idx) => (
                <Select.Item
                  index={idx + 1}
                  key={collection.id}
                  value={collection.id}
                  backgroundColor={
                    selectedCollection === collection.id ? "$green4" : undefined
                  }
                >
                  <CollectionSummary
                    collection={collection}
                    viewProps={{
                      borderWidth: 0,
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      backgroundColor: "inherit",
                    }}
                  />
                  <Select.ItemText display="none">
                    {collection.title}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Sheet.ScrollView>
        </Select.Viewport>

        <Select.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <Icon name="chevron-down" size={20} />
          </YStack>
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  );
}
