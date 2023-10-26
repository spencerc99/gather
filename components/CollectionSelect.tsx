import { useContext, useMemo } from "react";
import { Adapt, PortalProvider, Select, Sheet, YStack } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { Icon } from "./Themed";

export function CollectionSelect({
  selectedCollection,
  setSelectedCollection,
  collectionPlaceholder,
}: {
  selectedCollection: string | null;
  setSelectedCollection: (selectedCollection: string | null) => void;
  collectionPlaceholder?: string;
}) {
  const { collections } = useContext(DatabaseContext);

  return (
    <Select
      native
      onValueChange={setSelectedCollection}
      value={selectedCollection || undefined}
      disablePreventBodyScroll
    >
      <Select.Trigger>
        <Select.Value
          placeholder={collectionPlaceholder || "New collection"}
          placeholderTextColor="$gray9"
        />
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet
          modal
          dismissOnSnapToBottom
          native
          animationConfig={{
            type: "spring",
            damping: 20,
            mass: 1.2,
            stiffness: 250,
          }}
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

      <Select.Content zIndex={200000}>
        <Select.Viewport
          // to do animations:
          animation="quick"
          animateOnly={["transform", "opacity"]}
          enterStyle={{ o: 0, y: -10 }}
          exitStyle={{ o: 0, y: 10 }}
          minWidth={200}
        >
          <Select.Group>
            {/* for longer lists memoizing these is useful */}
            {useMemo(
              () =>
                collections.map((collection, i) => {
                  return (
                    <Select.Item
                      index={i}
                      key={collection.id}
                      value={collection.id}
                    >
                      <Select.ItemText>{collection.title}</Select.ItemText>
                      <Select.ItemIndicator marginLeft="auto">
                        <Icon size={16} name="check" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  );
                }),
              [collections]
            )}
          </Select.Group>
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
