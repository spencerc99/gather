import * as MediaLibrary from "expo-media-library";
import {
  memo,
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
  Modal,
  Platform,
  Pressable,
  StatusBar,
} from "react-native";
import { Spinner, XStack, YStack } from "tamagui";
import { DatabaseContext } from "../utils/db";
import { ErrorsContext } from "../utils/errors";
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
  // Bottom safe-area inset captured by the parent (useSafeAreaInsets() reports
  // 0 inside a native Modal) so the grid clears the home indicator.
  bottomInset?: number;
}

export function CustomPhotoPicker({
  visible,
  onClose,
  onConfirm,
  alreadyPickedAssetIds = [],
  bottomInset = 0,
}: CustomPhotoPickerProps) {
  const { getExistingAssetIds } = useContext(DatabaseContext);
  const { logError } = useContext(ErrorsContext);

  const [permission, requestPermission] = MediaLibrary.usePermissions();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Asset ids that already exist in Gather (queried per page as photos load).
  const [existingAssetIds, setExistingAssetIds] = useState<Set<string>>(
    new Set(),
  );
  const [filter, setFilter] = useState<FilterMode>("all");
  // Ordered list of selected asset ids (mirrors the native picker's ordered
  // selection so the badge numbers match insertion order).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sessionAddedSet = useMemo(
    () => new Set(alreadyPickedAssetIds.filter((id): id is string => !!id)),
    [alreadyPickedAssetIds],
  );

  const isAdded = useCallback(
    (assetId: string) =>
      existingAssetIds.has(assetId) || sessionAddedSet.has(assetId),
    [existingAssetIds, sessionAddedSet],
  );

  const screenWidth = Dimensions.get("window").width;
  const cellSize = Math.floor(
    (screenWidth - CellGap * (NumColumns - 1)) / NumColumns,
  );

  const resetState = useCallback(() => {
    setAssets([]);
    setEndCursor(undefined);
    setHasNextPage(true);
    setExistingAssetIds(new Set());
    setSelectedIds([]);
    setFilter("all");
  }, []);

  // Track loading synchronously so rapid onEndReached calls don't double-fetch.
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (cursor: string | undefined) => {
      if (loadingRef.current) {
        return;
      }
      // Never touch the media library before we actually have permission —
      // otherwise getAssetsAsync throws "MEDIA_LIBRARY permission is required".
      const perm = await MediaLibrary.getPermissionsAsync();
      if (!perm.granted) {
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
          result.assets.map((a) => a.id),
        );
        if (existing.length) {
          setExistingAssetIds((prev) => {
            const next = new Set(prev);
            existing.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch (err) {
        // Swallow so we never surface an unhandled rejection; stop paging.
        logError(err);
        setHasNextPage(false);
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [getExistingAssetIds, logError],
  );

  // Request permission and load the first page when opened.
  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    (async () => {
      let granted = permission?.granted;
      if (!granted) {
        const resp = await requestPermission();
        granted = resp.granted;
      }
      if (!cancelled && granted && assets.length === 0) {
        void loadPage(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
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
          : [...prev, assetId],
      );
    },
    [isAdded],
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

  const permissionDenied =
    permission && !permission.granted && !permission.canAskAgain;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      // pageSheet presents the picker as a card the OS already insets below the
      // notch/Dynamic Island, so there's nothing for the header to clip under.
      // On Android presentationStyle is ignored, so pad for the status bar.
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <YStack
        flex={1}
        backgroundColor="$background"
        paddingTop={
          Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0
        }
      >
        <YStack flex={1}>
          {/* No top bar — swipe the sheet down to dismiss. Filters sit up top
              with extra padding so they clear the sheet's grab handle. */}
          <XStack
            gap="$2"
            paddingHorizontal="$3"
            paddingTop="$5"
            paddingBottom="$2.5"
            alignItems="center"
          >
            {(
              [
                ["all", "All"],
                ["new", "Not added"],
                ["added", "Added"],
              ] as [FilterMode, string][]
            ).map(([mode, label]) => (
              <Pressable key={mode} onPress={() => setFilter(mode)}>
                <StyledView
                  paddingHorizontal="$3"
                  paddingVertical="$1.5"
                  borderRadius={16}
                  backgroundColor={filter === mode ? "$orange9" : "$gray4"}
                >
                  <StyledText
                    fontSize="$3"
                    color={filter === mode ? "white" : "$color"}
                  >
                    {label}
                  </StyledText>
                </StyledView>
              </Pressable>
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
              <StyledButton
                theme="orange"
                onPress={() => Linking.openSettings()}
              >
                Open Settings
              </StyledButton>
            </YStack>
          ) : (
            <FlatList
              data={filteredAssets}
              keyExtractor={(item) => item.id}
              numColumns={NumColumns}
              style={{ flex: 1 }}
              onEndReached={handleEndReached}
              onEndReachedThreshold={1.5}
              removeClippedSubviews
              initialNumToRender={24}
              windowSize={5}
              contentContainerStyle={{
                paddingBottom: 24,
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
              maxToRenderPerBatch={12}
              getItemLayout={(_, index) => {
                const rowHeight = cellSize + CellGap;
                return {
                  length: rowHeight,
                  offset: rowHeight * Math.floor(index / NumColumns),
                  index,
                };
              }}
              renderItem={({ item }) => {
                const selectionIndex = selectedIds.indexOf(item.id);
                return (
                  <PhotoCell
                    uri={item.uri}
                    isVideo={item.mediaType === MediaLibrary.MediaType.video}
                    duration={item.duration}
                    added={isAdded(item.id)}
                    isSelected={selectionIndex !== -1}
                    selectionIndex={selectionIndex}
                    cellSize={cellSize}
                    assetId={item.id}
                    onPress={toggleSelect}
                  />
                );
              }}
            />
          )}

          {/* Full-width Add button pinned to the bottom */}
          {!permissionDenied && (
            <YStack
              paddingHorizontal="$3"
              paddingTop="$2.5"
              paddingBottom={bottomInset + 12}
              borderTopWidth={1}
              borderTopColor="$gray4"
              backgroundColor="$background"
            >
              <StyledButton
                theme="green"
                size="$5"
                height={54}
                borderRadius={14}
                fontSize="$5"
                fontWeight="700"
                disabled={selectedIds.length === 0}
                opacity={selectedIds.length === 0 ? 0.5 : 1}
                onPress={handleConfirm}
              >
                {selectedIds.length > 0
                  ? `Add ${selectedIds.length} photo${
                      selectedIds.length > 1 ? "s" : ""
                    }`
                  : "Select photos to add"}
              </StyledButton>
            </YStack>
          )}
        </YStack>
      </YStack>
    </Modal>
  );
}

// Memoized so selecting one photo only re-renders the cells whose state
// actually changed, not the whole visible grid.
const PhotoCell = memo(function PhotoCell({
  uri,
  isVideo,
  duration,
  added,
  isSelected,
  selectionIndex,
  cellSize,
  assetId,
  onPress,
}: {
  uri: string;
  isVideo: boolean;
  duration: number;
  added: boolean;
  isSelected: boolean;
  selectionIndex: number;
  cellSize: number;
  assetId: string;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(assetId)}
      style={{
        width: cellSize,
        height: cellSize,
        marginRight: CellGap,
        marginBottom: CellGap,
      }}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />

      {/* Video duration badge */}
      {isVideo && (
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
            {formatDuration(duration)}
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
});

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
