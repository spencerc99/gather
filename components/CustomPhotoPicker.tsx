import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as MediaLibrary from "expo-media-library";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spinner, XStack, YStack } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { Icon, IconType, StyledButton, StyledText, StyledView } from "./Themed";

const PageSize = 90;
const NumColumns = 3;
const CellGap = 2;

type FilterMode = "all" | "new" | "added";

interface CustomPhotoPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (assets: MediaLibrary.Asset[]) => void;
  // Asset ids already staged in the composer this session. Treated the same as
  // assets already saved to Gather: shown as "added" and not selectable.
  alreadyPickedAssetIds?: (string | null | undefined)[];
}

export function CustomPhotoPicker({
  visible,
  onClose,
  onConfirm,
  alreadyPickedAssetIds = [],
}: CustomPhotoPickerProps) {
  const { getExistingAssetIds } = useContext(DatabaseContext);
  const insets = useSafeAreaInsets();
  const bottomTabHeight = useBottomTabBarHeight();

  const [permission, requestPermission] = MediaLibrary.usePermissions();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Asset ids that already exist in Gather (queried per page as photos load).
  const [existingAssetIds, setExistingAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [filter, setFilter] = useState<FilterMode>("all");
  // Ordered list of selected asset ids (mirrors the native picker's ordered
  // selection so the badge numbers match insertion order).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sessionAddedSet = useMemo(
    () => new Set(alreadyPickedAssetIds.filter((id): id is string => !!id)),
    [alreadyPickedAssetIds]
  );

  const isAdded = useCallback(
    (assetId: string) => existingAssetIds.has(assetId) || sessionAddedSet.has(assetId),
    [existingAssetIds, sessionAddedSet]
  );

  const screenWidth = Dimensions.get("window").width;
  const cellSize = Math.floor(
    (screenWidth - CellGap * (NumColumns - 1)) / NumColumns
  );

  const resetState = useCallback(() => {
    setAssets([]);
    setEndCursor(undefined);
    setHasNextPage(true);
    setExistingAssetIds(new Set());
    setSelectedIds([]);
    setFilter("all");
  }, []);

  // Track the latest cursor synchronously so rapid onEndReached calls don't
  // re-request the same page.
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (cursor: string | undefined) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setIsLoading(true);
      try {
        const result = await MediaLibrary.getAssetsAsync({
          first: PageSize,
          after: cursor,
          mediaType: [
            MediaLibrary.MediaType.photo,
            MediaLibrary.MediaType.video,
          ],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        setAssets((prev) => {
          // De-dupe in case of overlapping pages.
          const seen = new Set(prev.map((a) => a.id));
          const next = result.assets.filter((a) => !seen.has(a.id));
          return [...prev, ...next];
        });
        setEndCursor(result.endCursor);
        setHasNextPage(result.hasNextPage);

        // Cross-reference this page against Gather's saved blocks.
        const existing = await getExistingAssetIds(
          result.assets.map((a) => a.id)
        );
        if (existing.length) {
          setExistingAssetIds((prev) => {
            const next = new Set(prev);
            existing.forEach((id) => next.add(id));
            return next;
          });
        }
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [getExistingAssetIds]
  );

  // Request permission and load the first page when opened.
  useEffect(() => {
    if (!visible) {
      return;
    }
    (async () => {
      let granted = permission?.granted;
      if (!granted) {
        const resp = await requestPermission();
        granted = resp.granted;
      }
      if (granted && assets.length === 0) {
        void loadPage(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, permission?.granted]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || loadingRef.current) {
      return;
    }
    void loadPage(endCursor);
  }, [hasNextPage, endCursor, loadPage]);

  const toggleSelect = useCallback(
    (assetId: string) => {
      if (isAdded(assetId)) {
        return;
      }
      setSelectedIds((prev) =>
        prev.includes(assetId)
          ? prev.filter((id) => id !== assetId)
          : [...prev, assetId]
      );
    },
    [isAdded]
  );

  const filteredAssets = useMemo(() => {
    switch (filter) {
      case "new":
        return assets.filter((a) => !isAdded(a.id));
      case "added":
        return assets.filter((a) => isAdded(a.id));
      default:
        return assets;
    }
  }, [assets, filter, isAdded]);

  const handleConfirm = useCallback(() => {
    const byId = new Map(assets.map((a) => [a.id, a]));
    const picked = selectedIds
      .map((id) => byId.get(id))
      .filter((a): a is MediaLibrary.Asset => !!a);
    onConfirm(picked);
    resetState();
  }, [assets, selectedIds, onConfirm, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  if (!visible) {
    return null;
  }

  const permissionDenied =
    permission && !permission.granted && !permission.canAskAgain;

  return (
    <StyledView
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="$background"
      zIndex={1000}
    >
      <YStack flex={1} paddingTop={insets.top}>
        {/* Header */}
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$3"
          paddingVertical="$2"
        >
          <StyledButton
            chromeless
            circular
            size="$3"
            icon={<Icon name="close" size={24} />}
            onPress={handleClose}
            paddingHorizontal={0}
          />
          <StyledText bold fontSize="$5">
            Add photos
          </StyledText>
          <StyledButton
            theme="green"
            size="$3"
            disabled={selectedIds.length === 0}
            opacity={selectedIds.length === 0 ? 0.5 : 1}
            onPress={handleConfirm}
            borderRadius={20}
          >
            Add{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </StyledButton>
        </XStack>

        {/* Filter segmented control */}
        <XStack
          gap="$2"
          paddingHorizontal="$3"
          paddingBottom="$2"
          alignItems="center"
        >
          {(
            [
              ["all", "All"],
              ["new", "Not added"],
              ["added", "Added"],
            ] as [FilterMode, string][]
          ).map(([mode, label]) => (
            <StyledButton
              key={mode}
              size="$2"
              chromeless={filter !== mode}
              theme={filter === mode ? "orange" : undefined}
              backgroundColor={filter === mode ? "$orange4" : "$gray3"}
              borderRadius={16}
              onPress={() => setFilter(mode)}
            >
              <StyledText fontSize="$2">{label}</StyledText>
            </StyledButton>
          ))}
        </XStack>

        {permissionDenied ? (
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            gap="$3"
            paddingHorizontal="$4"
          >
            <StyledText textAlign="center">
              Gather needs access to your photos to add them.
            </StyledText>
            <StyledButton theme="orange" onPress={() => Linking.openSettings()}>
              Open Settings
            </StyledButton>
          </YStack>
        ) : (
          <FlatList
            data={filteredAssets}
            keyExtractor={(item) => item.id}
            numColumns={NumColumns}
            onEndReached={handleEndReached}
            onEndReachedThreshold={1.5}
            removeClippedSubviews
            initialNumToRender={PageSize}
            windowSize={5}
            contentContainerStyle={{
              paddingBottom: bottomTabHeight + insets.bottom + 16,
            }}
            ListEmptyComponent={
              isLoading ? null : (
                <YStack padding="$6" alignItems="center">
                  <StyledText metadata>
                    {filter === "added"
                      ? "Nothing here has been added yet."
                      : filter === "new"
                      ? "Everything here is already added."
                      : "No photos found."}
                  </StyledText>
                </YStack>
              )
            }
            ListFooterComponent={
              isLoading ? (
                <YStack padding="$4" alignItems="center">
                  <Spinner size="small" color="$orange9" />
                </YStack>
              ) : null
            }
            renderItem={({ item }) => {
              const added = isAdded(item.id);
              const selectionIndex = selectedIds.indexOf(item.id);
              const isSelected = selectionIndex !== -1;
              return (
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    marginRight: CellGap,
                    marginBottom: CellGap,
                  }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />

                  {/* Video duration badge */}
                  {item.mediaType === MediaLibrary.MediaType.video && (
                    <XStack
                      position="absolute"
                      bottom={4}
                      right={4}
                      backgroundColor="rgba(0,0,0,0.6)"
                      paddingHorizontal={4}
                      borderRadius={4}
                      alignItems="center"
                      gap={2}
                    >
                      <Icon name="videocam" size={10} color="white" />
                      <StyledText color="white" fontSize={10}>
                        {formatDuration(item.duration)}
                      </StyledText>
                    </XStack>
                  )}

                  {/* Already-added overlay: dim + checkmark, not selectable */}
                  {added && (
                    <StyledView
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      backgroundColor="rgba(0,0,0,0.55)"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon
                        name="checkmark-circle"
                        type={IconType.Ionicons}
                        size={28}
                        color="white"
                      />
                      <StyledText color="white" fontSize={10} marginTop={2}>
                        added
                      </StyledText>
                    </StyledView>
                  )}

                  {/* Selection badge */}
                  {!added && (
                    <StyledView
                      position="absolute"
                      top={6}
                      right={6}
                      width={22}
                      height={22}
                      borderRadius={11}
                      borderWidth={1.5}
                      borderColor="white"
                      backgroundColor={isSelected ? "$orange9" : "rgba(0,0,0,0.25)"}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isSelected && (
                        <StyledText color="white" fontSize={11} bold>
                          {selectionIndex + 1}
                        </StyledText>
                      )}
                    </StyledView>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </YStack>
    </StyledView>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
