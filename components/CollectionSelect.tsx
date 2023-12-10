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
} from "tamagui";
import { DatabaseContext } from "../utils/db";
import { Icon, InputWithIcon, StyledButton } from "./Themed";
import { CreateCollectionButton } from "./CreateCollectionButton";
import { currentUser } from "../utils/user";
import { CollectionSummary } from "./CollectionSummary";
import { filterItemsBySearchValue } from "../utils/search";

export function CollectionSelect({
  selectedCollection,
  setSelectedCollection,
  collectionPlaceholder = "New collection",
  triggerProps = {},
  onTriggerSelect,
}: {
  selectedCollection: string | null;
  setSelectedCollection: (selectedCollection: string | null) => void;
  collectionPlaceholder?: string;
  triggerProps?: SelectTriggerProps;
  onTriggerSelect?: () => void;
}) {
  const { collections, createCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounceValue(searchValue, 300);

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
  return (
    <Select
      native
      onValueChange={setSelectedCollection}
      // @ts-ignore
      value={selectedCollection}
      disablePreventBodyScroll
    >
      <Select.Trigger
        elevation="$3"
        {...triggerProps}
        onPress={() => {
          onTriggerSelect?.();
        }}
      >
        <Select.Value placeholder={collectionPlaceholder} />
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet
          modal
          native
          animationConfig={{
            type: "spring",
            damping: 20,
            mass: 1.2,
            stiffness: 150,
          }}
          dismissOnSnapToBottom
        >
          <Sheet.Frame>
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      <Select.Content>
        <Select.Viewport
          // to do animations:
          animation="quick"
          animateOnly={["transform", "opacity"]}
          enterStyle={{ o: 0, y: -10 }}
          exitStyle={{ o: 0, y: 10 }}
          minWidth={200}
        >
          <YStack margin="$2" marginBottom="$1">
            <InputWithIcon
              icon="search"
              placeholder="Search..."
              backgroundColor="$gray4"
              value={searchValue}
              onChangeText={(text) => setSearchValue(text)}
            />
          </YStack>
          <ScrollView
            contentContainerStyle={{
              // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
              paddingBottom: 24,
            }}
          >
            <XStack margin="$2" marginTop="$1">
              {searchValue ? (
                <StyledButton
                  onPress={async () => {
                    await createCollection({
                      title: searchValue,
                      createdBy: currentUser().id,
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
                      {searchValue}
                    </SizableText>
                  </SizableText>
                </StyledButton>
              ) : (
                <CreateCollectionButton />
              )}
            </XStack>
            {/* TODO: add some thing about last message */}
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
                  <Select.ItemText>{collectionPlaceholder}</Select.ItemText>
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
          </ScrollView>
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
