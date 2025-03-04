import { memo, useCallback, useContext, useMemo, useState } from "react";
import { Alert, FlatList, Keyboard } from "react-native";
import { Swipeable, gestureHandlerRootHOC } from "react-native-gesture-handler";
import {
  Adapt,
  GetProps,
  ListItemFrame,
  Select,
  SelectTriggerProps,
  Sheet,
  SizableText,
  Spinner,
  XStack,
  YStack,
  setupNativeSheet,
} from "tamagui";
import { Collection } from "../utils/dataTypes";
import { DatabaseContext, useCollections } from "../utils/db";
import { UserContext } from "../utils/user";
import { CollectionSummary } from "./CollectionSummary";
import { CreateCollectionButton } from "./CreateCollectionButton";
import { Icon, SearchBarInput, StyledButton, StyledText } from "./Themed";
// @ts-ignore
import { ModalView } from "react-native-ios-modal";

setupNativeSheet("ios", ModalView);

const CollectionSelectableItem = memo(
  ({
    collection,
    index,
    selectedCollection,
    otherProps,
  }: {
    collection: Collection;
    index: number;
    selectedCollection: string | null;
    otherProps?: GetProps<typeof ListItemFrame>;
  }) => (
    <Select.Item
      index={index + 1}
      key={collection.id}
      value={collection.id}
      backgroundColor={
        selectedCollection === collection.id ? "$green4" : undefined
      }
      {...otherProps}
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
      <Select.ItemText display="none">{collection.title}</Select.ItemText>
    </Select.Item>
  )
);

const CollectionSelectImpl = ({
  collection,
  deleteCollection,
  index,
  selectedCollection,
}: {
  collection: Collection;
  deleteCollection: (collectionId: string) => void;
  index: number;
  selectedCollection: string | null;
}) => (
  <Swipeable
    key={collection.id}
    containerStyle={{
      overflow: "visible",
    }}
    friction={2}
    renderRightActions={(_progress, _drag, swipeable) => (
      <YStack
        alignItems="center"
        padding="$2"
        paddingLeft={0}
        justifyContent="center"
      >
        <StyledButton
          circular
          theme="red"
          size="$6"
          icon={<Icon name="trash" />}
          onPress={() => {
            Alert.alert(
              `Delete "${collection.title}"?`,
              "Connected blocks won't be affected.",
              [
                {
                  text: "Cancel",
                  onPress: () => {
                    swipeable.close();
                  },
                  style: "cancel",
                },
                {
                  text: "Delete",
                  onPress: () => {
                    deleteCollection(collection.id);
                    swipeable.close();
                  },
                  style: "destructive",
                },
              ]
            );
          }}
        ></StyledButton>
      </YStack>
    )}
  >
    <CollectionSelectableItem
      collection={collection}
      index={index}
      selectedCollection={selectedCollection}
    />
  </Swipeable>
);

const CollectionSelectWrapped = gestureHandlerRootHOC(CollectionSelectImpl);

const CollectionSelectView = memo(
  ({
    collection,
    deleteCollection,
    index,
    selectedCollection,
  }: {
    collection: Collection;
    deleteCollection: (collectionId: string) => void;
    index: number;
    selectedCollection: string | null;
  }) => (
    <CollectionSelectWrapped
      collection={collection}
      deleteCollection={deleteCollection}
      index={index}
      selectedCollection={selectedCollection}
    />
  )
);

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
  const { createCollection, deleteCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  const { currentUser: user } = useContext(UserContext);
  const {
    collections,
    isLoading,
    debouncedFetchMoreCollections,
    isFetchingNextPage,
  } = useCollections({
    searchValue,
    selectedCollectionId: selectedCollection || undefined,
  });
  const [open, setOpen] = useState(false);

  // TODO: collapse with SelectCollectionsList
  const renderCollection = useCallback(
    ({ item: collection, index }: { item: Collection; index: number }) => {
      return (
        <CollectionSelectView
          collection={collection}
          deleteCollection={deleteCollection}
          index={index}
          selectedCollection={selectedCollection}
        />
      );
    },
    [selectedCollection]
  );

  const listHeader = useMemo(() => {
    return (
      <>
        <XStack margin="$2" marginTop="$1" justifyContent="center">
          {searchValue ? (
            <StyledButton
              onPress={async () => {
                await createCollection({
                  title: searchValue,
                  createdBy: user!.id,
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
            <CreateCollectionButton
              onPress={() => {
                setOpen(false);
              }}
            />
          )}
        </XStack>
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
      </>
    );
  }, [searchValue, selectedCollection, user]);

  function renderCollections() {
    if (isLoading || !open) {
      return <Spinner color="$orange9" size="small" />;
    }
    return (
      <FlatList
        // @ts-ignore
        renderScrollComponent={(props) => <Sheet.ScrollView {...props} />}
        ListHeaderComponent={() => listHeader}
        keyboardShouldPersistTaps={"handled"}
        data={collections}
        contentContainerStyle={{
          gap: 4,
          paddingBottom: 24,
        }}
        renderItem={renderCollection}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (!open) {
            return;
          }
          debouncedFetchMoreCollections();
        }}
        ListFooterComponent={
          <YStack
            justifyContent="center"
            alignSelf="center"
            alignItems="center"
            width="100%"
          >
            {isFetchingNextPage && <Spinner size="small" color="$orange9" />}
          </YStack>
        }
      />
    );
  }

  // This is so there is data for the placeholder, display none to not show
  const selectedCollectionItem = collections
    ?.filter((c) => c.id === selectedCollection?.toString())
    .map((c, index) => (
      <CollectionSelectableItem
        collection={c}
        index={index}
        selectedCollection={selectedCollection}
        otherProps={{
          display: "none",
        }}
      />
    ))?.[0];

  if (!user) {
    return;
  }

  return (
    <Select
      // TODO: dumb because sometimes it is a number...
      onValueChange={(val) => {
        setSelectedCollection(val ? val.toString() : val);
        onTriggerSelect?.();
      }}
      // @ts-ignore
      value={
        selectedCollection ? selectedCollection.toString() : selectedCollection
      }
      disablePreventBodyScroll
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        Keyboard.dismiss();
        if (!isOpen) {
          setSearchValue("");
        }
      }}
      {...selectProps}
    >
      <Select.Trigger elevation="$3" {...triggerProps}>
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

      <Adapt platform="touch">
        <Sheet
          modal
          animationConfig={{
            type: "spring",
            damping: 10,
            mass: 0.3,
            stiffness: 120,
          }}
          dismissOnSnapToBottom
          snapPoints={[85]}
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
          {/* TODO: add some preview about last message */}
          {selectedCollectionItem}
          {renderCollections()}
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
