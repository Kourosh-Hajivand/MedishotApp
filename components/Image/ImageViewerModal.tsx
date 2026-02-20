import type { PracticeSettings } from "@/components";
import { ImageEditorModal } from "@/components/ImageEditor";
import colors from "@/theme/colors";
import { useAuth } from "@/utils/hook/useAuth";
import { useBookmarkMedia, useDeletePatientMedia, useUnbookmarkMedia } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import type { Practice } from "@/utils/service/models/ResponseModels";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Dimensions, Modal, Image as RNImage, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

const { width, height } = Dimensions.get("window");

// Gap between main carousel images (px)
const IMAGE_GAP = 8;
const IMAGE_PAGE_WIDTH = width + IMAGE_GAP;

// Softer pan when zoomed so image doesn't move too fast
const PAN_SENSITIVITY = 0.7;

// Thumbnail strip layout (must match scrollThumbnailToPosition and worklet math)
const ACTIVE_THUMB_WIDTH = 44;
const INACTIVE_THUMB_WIDTH = 24;
const THUMB_GAP = 2;
const ACTIVE_THUMB_MARGIN = 6;
const THUMB_PADDING = width / 2 - 22;

function getThumbnailScrollXForPage(currentPage: number, count: number): number {
    if (count <= 0) return 0;
    const clampedPage = Math.max(0, Math.min(currentPage, count - 1));
    const fromIndex = Math.floor(clampedPage);
    const toIndex = Math.min(Math.ceil(clampedPage), count - 1);
    const progress = clampedPage - fromIndex;

    const getPos = (idx: number) => {
        let pos = THUMB_PADDING;
        for (let i = 0; i < idx; i++) pos += INACTIVE_THUMB_WIDTH + THUMB_GAP;
        return pos + ACTIVE_THUMB_MARGIN + ACTIVE_THUMB_WIDTH / 2;
    };
    const fromPos = getPos(fromIndex);
    const toPos = fromIndex === toIndex ? fromPos : getPos(toIndex);
    const interpolatedPos = fromPos + (toPos - fromPos) * progress;
    const scrollX = interpolatedPos - width / 2;
    const totalWidth = THUMB_PADDING + count * INACTIVE_THUMB_WIDTH + (count - 1) * THUMB_GAP + ACTIVE_THUMB_MARGIN + (ACTIVE_THUMB_WIDTH - INACTIVE_THUMB_WIDTH) + ACTIVE_THUMB_MARGIN + THUMB_PADDING;
    const maxScroll = Math.max(0, totalWidth - width);
    return Math.max(0, Math.min(scrollX, maxScroll));
}

import { containerSize, iconSize } from "@/constants/theme";
import { IconSymbol } from "../ui/icon-symbol";
import { ViewerActionsConfig } from "./GalleryWithMenu";
import { BottomActionBar } from "./ImageViewerModal/BottomActionBar";
import { HeaderBar } from "./ImageViewerModal/HeaderBar";
import { ImageViewerItem } from "./ImageViewerModal/ImageViewerItem";
import { ImageCarousel } from "./ImageViewerModal/ImageCarousel";
import { NotesOverlay } from "./ImageViewerModal/NotesOverlay";
import { NotesPanelContainer } from "./ImageViewerModal/NotesPanelContainer";
import { ShareCompositionView } from "./ImageViewerModal/ShareCompositionView";
import { ThumbnailItem } from "./ImageViewerModal/ThumbnailItem";
import { ThumbnailStrip } from "./ImageViewerModal/ThumbnailStrip";
import { useImageViewerDerivedData } from "./ImageViewerModal/useImageViewerDerivedData";

interface MediaItem {
    url: string;
    mediaId?: number | string;
    isBookmarked?: boolean;
    createdAt?: string;
}

// Raw media data structure from API (with template and images)
interface RawMediaData {
    id: number | string;
    template?: {
        id: number | string;
        [key: string]: any;
    } | null;
    original_media?: {
        url: string;
        [key: string]: any;
    } | null;
    images?: Array<{
        image?: {
            url: string;
            [key: string]: any;
        } | null;
        [key: string]: any;
    }>;
    taker?: {
        id?: number;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
    } | null;
    created_at?: string;
    has_after?: boolean;
    is_after?: boolean;
    before_media_id?: number | string | null;
    after_media?: {
        original_media?: { url: string; [key: string]: any } | null;
        [key: string]: any;
    } | null;
    [key: string]: any;
}

const defaultPracticeSettings: PracticeSettings = {
    avatar: "logo",
    practiceName: true,
    doctorName: true,
    address: true,
    practicePhone: true,
    practiceURL: true,
    practiceEmail: true,
    practiceSocialMedia: true,
};

interface ShareCompositionMetadata {
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    print_settings?: PracticeSettings;
}

interface ImageViewerModalProps {
    visible: boolean;
    images: string[]; // For backward compatibility
    initialIndex: number;
    onClose: () => void;
    // New prop: pass raw media data and component will build maps internally
    mediaData?: MediaItem[];
    // Legacy props (for backward compatibility)
    imageUrlToMediaIdMap?: Map<string, number | string>;
    imageUrlToBookmarkMap?: Map<string, boolean>;
    imageUrlToCreatedAtMap?: Map<string, string>;
    patientId?: string | number;
    // Map imageUrl to patientId for dynamic patient switching
    imageUrlToPatientIdMap?: Map<string, number>;
    // Map imageUrl to taker info for displaying who took the photo
    imageUrlToTakerMap?: Map<string, { first_name?: string | null; last_name?: string | null }>;
    actions?: ViewerActionsConfig;
    // Raw media data from API (with template and images structure) - used to build taker and createdAt maps
    rawMediaData?: RawMediaData[];
    // Display description option: "Date" to show when photo was taken, "taker" to show who took it
    description?: "Date" | "taker";
    // Callback for restore action (for archived media)
    onRestore?: (imageUri: string) => void;
    // Optional: when provided, Share will compose header + image + footer into one image
    practice?: Practice;
    metadata?: ShareCompositionMetadata | null;
    /** Only show "Take after Template" when true (e.g. only on patient gallery page) */
    enableTakeAfterTemplate?: boolean;
    /** Callback when note icon is pressed (optional; showNote in actions must be true to show icon) */
    onNotePress?: (imageUri: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
    visible,
    images,
    initialIndex,
    onClose,
    mediaData,
    imageUrlToMediaIdMap,
    imageUrlToBookmarkMap,
    imageUrlToCreatedAtMap,
    patientId,
    imageUrlToPatientIdMap,
    imageUrlToTakerMap,
    actions = { showBookmark: true, showEdit: true, showArchive: true, showShare: true, showNote: false },
    rawMediaData,
    description = "taker",
    onRestore,
    practice,
    metadata,
    enableTakeAfterTemplate = false,
    onNotePress,
}) => {
    const { profile: me } = useAuth();
    const router = useRouter();

    const [displayIndex, setDisplayIndex] = useState(initialIndex); // Updates with scroll so header/Take After Template stay in sync

    // Use hook for all derived data and maps
    const derivedData = useImageViewerDerivedData({
        rawMediaData,
        mediaData,
        images,
        imageUrlToMediaIdMap,
        imageUrlToBookmarkMap,
        imageUrlToCreatedAtMap,
        imageUrlToTakerMap,
        actions,
        displayIndex,
    });

    const {
        imagesList,
        maps: {
            imageUrlToMediaIdMapInternal,
            imageUrlToBookmarkMapInternal,
            imageUrlToCreatedAtMapInternal,
            imageUrlToMediaImageIdMapInternal,
            imageUrlToHasTemplateMapInternal,
            imageUrlToOriginalUriMapInternal,
            imageUrlToEditorStateMapInternal,
        },
        derived: {
            currentTaker,
            currentCreatedAt,
            isCurrentImageOriginalMedia,
            isCurrentImageFromTemplate,
            isCurrentImageComposite,
            isCurrentImageCompositeOriginal,
            isCurrentImageCompositeChild,
            isCurrentImageSingleImage,
            isCurrentImageHideTakeAfter,
            isCurrentImageOriginalNoBeforeAfter,
            currentImageHasAfter,
        },
        effectiveActions,
        notesForCurrentImage,
    } = derivedData;

    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const isProgrammaticScroll = useSharedValue(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [imageSizes, setImageSizes] = useState<Record<number, { width: number; height: number }>>({});
    const [isZoomed, setIsZoomed] = useState(false);
    const [localBookmarkMap, setLocalBookmarkMap] = useState<Map<string, boolean>>(new Map());
    const [imageEditorVisible, setImageEditorVisible] = useState(false);
    const [imageEditorUri, setImageEditorUri] = useState<string | undefined>();
    const [imageEditorTool, setImageEditorTool] = useState<string | undefined>();
    const [notesPanelVisible, setNotesPanelVisible] = useState(false);
    /** Keeps bottom bar layout (pinned + minHeight) during close animation so content slides up smoothly without reflow lag */
    const [isNotesClosing, setIsNotesClosing] = useState(false);
    /** Note selected in notes panel / on image markers; syncs panel and overlay */
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    // Track loading state for each image
    const [imageLoadingStates, setImageLoadingStates] = useState<Map<number, boolean>>(new Map());
    // Track loading state for thumbnail images
    const [thumbnailLoadingStates, setThumbnailLoadingStates] = useState<Map<string, boolean>>(new Map());
    // Share composition: when practice + metadata provided, compose header + image + footer for share
    const [isSharingComposition, setIsSharingComposition] = useState(false);
    const [shareCompositionImageUri, setShareCompositionImageUri] = useState<string | null>(null);
    const [shareCompositionDimensions, setShareCompositionDimensions] = useState<{ width: number; height: number } | null>(null);
    const [shareCompositionImageLoaded, setShareCompositionImageLoaded] = useState(false);
    const shareViewRef = useRef<ViewShot>(null);
    const printSettings: PracticeSettings = React.useMemo(() => metadata?.print_settings ?? defaultPracticeSettings, [metadata?.print_settings]);
    // Animated opacity values for smooth transitions
    const imageOpacitiesRef = useRef<Map<number, ReturnType<typeof useSharedValue<number>>>>(new Map());
    const skeletonOpacitiesRef = useRef<Map<number, ReturnType<typeof useSharedValue<number>>>>(new Map());
    const thumbnailOpacitiesRef = useRef<Map<string, ReturnType<typeof useSharedValue<number>>>>(new Map());
    const thumbnailSkeletonOpacitiesRef = useRef<Map<string, ReturnType<typeof useSharedValue<number>>>>(new Map());

    // Shared values for zoom and pan (only for current image)
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const scrollProgress = useSharedValue(0); // Progress of swipe: -1 to 1 (left to right)
    const currentIndexShared = useSharedValue(initialIndex); // Shared value for current index
    const dismissTranslateY = useSharedValue(0); // Swipe down to dismiss (iPhone Photos style)
    // Thumbnail strip scroll position - driven on UI thread for perfect sync with image swipe
    const thumbnailScrollX = useSharedValue(getThumbnailScrollXForPage(initialIndex, imagesList.length));
    // Notes panel: header slides up, bottom bar slides down, X slides into Back position, notes panel slides up
    const HEADER_SLIDE_UP = 80;
    const BOTTOM_SLIDE_DOWN = 120;
    const NOTES_PANEL_SLIDE_UP = 320;
    const X_BUTTON_SLIDE_OFFSET = 56;
    /** Height of thumbnail strip + gap + action row when notes closed; keeps bottom bar layout stable */
    const BOTTOM_BAR_CONTENT_HEIGHT = 130;
    const bottomBarContentOpacity = useSharedValue(1);
    const bottomBarContentTranslateY = useSharedValue(0);
    const notesPanelOpacity = useSharedValue(0);
    const notesPanelTranslateY = useSharedValue(NOTES_PANEL_SLIDE_UP);
    const headerContentOpacity = useSharedValue(1);
    const headerTranslateY = useSharedValue(0);
    const notesCloseBarOpacity = useSharedValue(0);
    const notesCloseBarTranslateY = useSharedValue(-X_BUTTON_SLIDE_OFFSET);

    // Get current patientId from displayIndex (updates with scroll)
    const currentPatientId = React.useMemo(() => {
        if (imageUrlToPatientIdMap && imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToPatientIdMap.get(currentImageUrl) || patientId;
        }
        return patientId;
    }, [displayIndex, imagesList, imageUrlToPatientIdMap, patientId]);

    // Destructure effective actions (for bottom buttons)
    const { showBookmark = true, showEdit = true, showArchive = true, showShare = true, showRestore = false, showMagic = false, showNote = false, showCompare = false } = effectiveActions;

    // Destructure effective actions for more menu (sync with bottom buttons)
    const { showArchive: showArchiveInMore = true, showEdit: showEditInMore = true, showMagic: showMagicInMore = false, showCompare: showCompareInMore = false } = effectiveActions;

    // Fetch patient data if patientId is provided
    const { data: patientDataResponse } = useGetPatientById(currentPatientId || "");
    const patientData = patientDataResponse?.data;

    const scrollThumbnailToPosition = React.useCallback(
        (currentPage: number) => {
            const scrollX = getThumbnailScrollXForPage(currentPage, imagesList.length);
            thumbnailScrollX.value = scrollX;
        },
        [imagesList.length],
    );

    const scrollThumbnailToIndex = React.useCallback(
        (index: number) => {
            scrollThumbnailToPosition(index);
        },
        [scrollThumbnailToPosition],
    );

    // Reset index when modal closes; sync thumbnail and displayIndex when modal opens
    React.useEffect(() => {
        if (!visible) {
            setDisplayIndex(initialIndex);
            setNotesPanelVisible(false);
            setIsNotesClosing(false);
            setSelectedNoteId(null);
            currentIndexShared.value = initialIndex;
            scale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
            setIsZoomed(false);
            // Reset notes panel animation values so next open is correct
            headerTranslateY.value = 0;
            headerContentOpacity.value = 1;
            bottomBarContentTranslateY.value = 0;
            bottomBarContentOpacity.value = 1;
            notesCloseBarTranslateY.value = -X_BUTTON_SLIDE_OFFSET;
            notesCloseBarOpacity.value = 0;
            notesPanelTranslateY.value = NOTES_PANEL_SLIDE_UP;
            notesPanelOpacity.value = 0;
        } else {
            setDisplayIndex(initialIndex);
            thumbnailScrollX.value = getThumbnailScrollXForPage(initialIndex, imagesList.length);
        }
    }, [visible, initialIndex, imagesList.length]);

    // When modal becomes visible, sync shared value and thumbnail position
    React.useEffect(() => {
        if (visible) {
            currentIndexShared.value = displayIndex;
        }
    }, [visible, displayIndex]);

    // When share composition is ready, capture and share
    React.useEffect(() => {
        if (!isSharingComposition || !shareCompositionImageUri || !shareCompositionDimensions || !shareCompositionImageLoaded || !shareViewRef.current) return;

        const runCapture = async () => {
            const ref = shareViewRef.current;
            if (!ref) {
                setIsSharingComposition(false);
                setShareCompositionImageUri(null);
                setShareCompositionDimensions(null);
                setShareCompositionImageLoaded(false);
                return;
            }
            // Give extra time for image to fully render
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            await new Promise((r) => setTimeout(r, 100));

            try {
                const uri = await captureRef(ref, {
                    format: "png",
                    quality: 1.0,
                    result: "tmpfile",
                    snapshotContentContainer: false,
                });
                await Share.share({ url: uri });
            } catch (err: any) {
                if (err?.message !== "User did not share") {
                    try {
                        await Share.share({ url: shareCompositionImageUri });
                    } catch {
                        Alert.alert("Error", "Failed to share image");
                    }
                }
            } finally {
                setIsSharingComposition(false);
                setShareCompositionImageUri(null);
                setShareCompositionDimensions(null);
                setShareCompositionImageLoaded(false);
            }
        };

        runCapture();
    }, [isSharingComposition, shareCompositionImageUri, shareCompositionDimensions, shareCompositionImageLoaded]);

    // Reset zoom when displayIndex changes (momentum end or thumbnail tap) and scroll thumbnail
    React.useEffect(() => {
        scale.value = withTiming(1, { duration: 250 });
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        setIsZoomed(false);
        currentIndexShared.value = displayIndex;
        scrollThumbnailToIndex(displayIndex);
    }, [displayIndex, scrollThumbnailToIndex]);

    const handleScroll = useAnimatedScrollHandler(
        {
            onScroll: (event) => {
                "worklet";
                if (isProgrammaticScroll.value) return;
                if (scale.value > 1) return;

                const offsetX = event.contentOffset.x;
                const currentPage = offsetX / IMAGE_PAGE_WIDTH;
                const count = imagesList.length;
                if (count <= 0) return;

                const clampedPage = Math.max(0, Math.min(currentPage, count - 1));
                const fromIndex = Math.floor(clampedPage);
                const toIndex = Math.min(Math.ceil(clampedPage), count - 1);
                const progress = clampedPage - fromIndex;

                // Same math as getThumbnailScrollXForPage - all on UI thread for perfect sync
                const getPos = (idx: number) => {
                    let pos = THUMB_PADDING;
                    for (let i = 0; i < idx; i++) pos += INACTIVE_THUMB_WIDTH + THUMB_GAP;
                    return pos + ACTIVE_THUMB_MARGIN + ACTIVE_THUMB_WIDTH / 2;
                };
                const fromPos = getPos(fromIndex);
                const toPos = fromIndex === toIndex ? fromPos : getPos(toIndex);
                const interpolatedPos = fromPos + (toPos - fromPos) * progress;
                let scrollX = interpolatedPos - width / 2;
                const totalWidth = THUMB_PADDING + count * INACTIVE_THUMB_WIDTH + (count - 1) * THUMB_GAP + ACTIVE_THUMB_MARGIN + (ACTIVE_THUMB_WIDTH - INACTIVE_THUMB_WIDTH) + ACTIVE_THUMB_MARGIN + THUMB_PADDING;
                const maxScroll = Math.max(0, totalWidth - width);
                thumbnailScrollX.value = Math.max(0, Math.min(scrollX, maxScroll));

                const index = Math.round(clampedPage);
                scrollProgress.value = clampedPage - index; // -0.5..0.5 for thumbnail scale animation
                currentIndexShared.value = index;
            },
        },
        [imagesList.length],
    );

    // Sync currentIndexShared -> displayIndex during scroll so bottom bar/header update immediately, not only on momentum end
    useAnimatedReaction(
        () => currentIndexShared.value,
        (idx) => {
            const clamped = Math.max(0, Math.min(Math.round(idx), imagesList.length - 1));
            runOnJS(setDisplayIndex)(clamped);
        },
        [imagesList.length],
    );

    const handleMomentumScrollEnd = (event: any) => {
        if (isProgrammaticScroll.value) {
            isProgrammaticScroll.value = false;
            return;
        }

        if (scale.value > 1) {
            return;
        }

        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / IMAGE_PAGE_WIDTH);
        const validIndex = Math.max(0, Math.min(index, imagesList.length - 1));

        scrollProgress.value = withTiming(0, { duration: 200 });
        setDisplayIndex(validIndex);
        currentIndexShared.value = validIndex;
    };

    const handleEditPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = imagesList[displayIndex];
        setImageEditorUri(currentImageUri);
        setImageEditorTool(undefined);
        setImageEditorVisible(true);
    };

    // Bookmark mutations (use displayIndex = image being viewed)
    const { mutate: bookmarkMedia } = useBookmarkMedia(
        () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const currentImageUri = imagesList[displayIndex];
            setLocalBookmarkMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentImageUri, true);
                return newMap;
            });
        },
        (error) => {
            console.error("Error bookmarking media:", error);
            Alert.alert("Error", error.message || "Failed to bookmark image");
            const currentImageUri = imagesList[displayIndex];
            setLocalBookmarkMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentImageUri, imageUrlToBookmarkMapInternal.get(currentImageUri) ?? false);
                return newMap;
            });
        },
    );

    const { mutate: unbookmarkMedia } = useUnbookmarkMedia(
        () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const currentImageUri = imagesList[displayIndex];
            setLocalBookmarkMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentImageUri, false);
                return newMap;
            });
        },
        (error) => {
            console.error("Error unbookmarking media:", error);
            Alert.alert("Error", error.message || "Failed to unbookmark image");
            const currentImageUri = imagesList[displayIndex];
            setLocalBookmarkMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentImageUri, imageUrlToBookmarkMapInternal.get(currentImageUri) ?? false);
                return newMap;
            });
        },
    );

    // Archive mutation
    const { mutate: archiveMedia } = useDeletePatientMedia(
        () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Image archived successfully");
            onClose();
        },
        (error) => {
            console.error("Error archiving media:", error);
            Alert.alert("Error", error.message || "Failed to archive image");
        },
    );

    // Initialize local bookmark map from prop map when it changes or modal opens
    React.useEffect(() => {
        if (imageUrlToBookmarkMap && imageUrlToBookmarkMap.size > 0) {
            setLocalBookmarkMap(new Map(imageUrlToBookmarkMap));
        }
    }, [imageUrlToBookmarkMap, visible]);

    // Initialize loading states when modal opens or images change
    // Main images: no loading state (no white skeleton on open) – only thumbnails show loading
    React.useEffect(() => {
        if (visible) {
            const initialLoadingStates = new Map<number, boolean>();
            const initialThumbnailLoadingStates = new Map<string, boolean>();
            imagesList.forEach((imageUri, index) => {
                initialLoadingStates.set(index, false);
                initialThumbnailLoadingStates.set(imageUri, true);
            });
            setImageLoadingStates(initialLoadingStates);
            setThumbnailLoadingStates(initialThumbnailLoadingStates);
        }
    }, [visible, imagesList.length]);

    const handleBookmarkPress = () => {
        const currentImageUri = imagesList[displayIndex];
        const mediaId = imageUrlToMediaIdMapInternal.get(currentImageUri);
        const isBookmarked = localBookmarkMap.get(currentImageUri) ?? imageUrlToBookmarkMapInternal.get(currentImageUri) ?? false;

        if (!mediaId) {
            Alert.alert("Error", "Could not find media ID for this image");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isBookmarked) {
            unbookmarkMedia(mediaId);
        } else {
            bookmarkMedia(mediaId);
        }
    };


    React.useEffect(() => {
        if (notesPanelVisible && notesForCurrentImage.length > 0) {
            const firstId = notesForCurrentImage[0]?.id ?? null;
            setSelectedNoteId((prev) => (notesForCurrentImage.some((n) => n.id === prev) ? prev : firstId));
        }
    }, [notesPanelVisible, displayIndex, notesForCurrentImage]);

    const openNotesPanel = React.useCallback(() => {
        const currentImageUri = imagesList[displayIndex];
        setNotesPanelVisible(true);
        const notes = imageUrlToEditorStateMapInternal.get(currentImageUri ?? "")?.notes ?? [];
        setSelectedNoteId(notes[0]?.id ?? null);
        onNotePress?.(currentImageUri ?? "");
    }, [displayIndex, imagesList, imageUrlToEditorStateMapInternal, onNotePress]);

    const handleNotePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const duration = 220;
        const onZoomOutDone = () => {
            setIsZoomed(false);
            openNotesPanel();
        };
        scale.value = withTiming(1, { duration }, (finished) => {
            if (finished) runOnJS(onZoomOutDone)();
        });
        translateX.value = withTiming(0, { duration });
        translateY.value = withTiming(0, { duration });
    };

    // When notes panel opens: header slides up + fades, bottom bar slides down + fades, X slides in, notes panel slides up
    React.useEffect(() => {
        if (notesPanelVisible) {
            headerTranslateY.value = withTiming(-HEADER_SLIDE_UP, { duration: 280 });
            headerContentOpacity.value = withTiming(0, { duration: 250 });
            bottomBarContentTranslateY.value = withTiming(BOTTOM_SLIDE_DOWN, { duration: 280 });
            bottomBarContentOpacity.value = withTiming(0, { duration: 250 });
            notesCloseBarTranslateY.value = withTiming(0, { duration: 280 });
            notesCloseBarOpacity.value = withTiming(1, { duration: 250 });
            notesPanelTranslateY.value = withTiming(0, { duration: 300 });
            notesPanelOpacity.value = withTiming(1, { duration: 280 });
        }
    }, [notesPanelVisible]);

    const handleNotesPanelClose = React.useCallback(() => {
        setIsNotesClosing(true);
        // Reset zoom when closing notes so user exits zoom state
        scale.value = withTiming(1, { duration: 220 });
        translateX.value = withTiming(0, { duration: 220 });
        translateY.value = withTiming(0, { duration: 220 });
        setIsZoomed(false);

        notesPanelTranslateY.value = withTiming(NOTES_PANEL_SLIDE_UP, { duration: 280 });
        notesPanelOpacity.value = withTiming(0, { duration: 250 });
        notesCloseBarTranslateY.value = withTiming(-X_BUTTON_SLIDE_OFFSET, { duration: 280 });
        notesCloseBarOpacity.value = withTiming(0, { duration: 250 });
        headerTranslateY.value = withTiming(0, { duration: 280 });
        headerContentOpacity.value = withTiming(1, { duration: 250 });
        bottomBarContentTranslateY.value = withTiming(0, { duration: 280 });
        bottomBarContentOpacity.value = withTiming(1, { duration: 250 });
        // Unmount notes panel after slide-up; keep layout (pinned + minHeight) until animation fully done to avoid reflow lag
        setTimeout(() => setNotesPanelVisible(false), 300);
        setTimeout(() => setIsNotesClosing(false), 380);
    }, [scale, translateX, translateY, notesPanelOpacity, notesPanelTranslateY, notesCloseBarOpacity, notesCloseBarTranslateY, headerContentOpacity, headerTranslateY, bottomBarContentOpacity, bottomBarContentTranslateY]);

    /** Open image editor on Note tab (from notes panel Edit / Add note); closes notes panel */
    const handleNotesPanelEditPress = React.useCallback(() => {
        const uri = imagesList[displayIndex];
        if (!uri) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setImageEditorUri(uri);
        setImageEditorTool("Note");
        setImageEditorVisible(true);
        handleNotesPanelClose();
    }, [displayIndex, imagesList, handleNotesPanelClose]);

    const handleAdjustPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = imagesList[displayIndex];
        setImageEditorUri(currentImageUri);
        setImageEditorTool("Adjust");
        setImageEditorVisible(true);
    };

    const handleSplitPress = () => {
        const currentImageUri = imagesList[displayIndex];
        if (!rawMediaData?.length || !patientId) return;

        const pairs: { beforeUrl: string; afterUrl: string; beforeDate?: string; afterDate?: string }[] = [];
        let currentPairIndex = 0;
        type ImageCell = NonNullable<RawMediaData["images"]>[number];
        let beforeImages: ImageCell[] | null = null;
        let afterImages: ImageCell[] | null = null;

        // Find the single before/after set that contains the current image (only pass that set to compare)
        for (const media of rawMediaData) {
            if (media.has_after && media.after_media?.images?.length && media.images?.length) {
                if (media.original_media?.url === currentImageUri) {
                    beforeImages = media.images;
                    afterImages = media.after_media.images;
                    currentPairIndex = 0;
                    break;
                }
                const beforeIdx = media.images.findIndex((img: any) => img.image?.url === currentImageUri);
                if (beforeIdx >= 0) {
                    beforeImages = media.images;
                    afterImages = media.after_media.images;
                    currentPairIndex = beforeIdx;
                    break;
                }
                if (media.after_media.original_media?.url === currentImageUri) {
                    beforeImages = media.images;
                    afterImages = media.after_media.images;
                    currentPairIndex = 0;
                    break;
                }
                const afterIdx = media.after_media.images.findIndex((img: any) => img.image?.url === currentImageUri);
                if (afterIdx >= 0) {
                    beforeImages = media.images;
                    afterImages = media.after_media.images;
                    currentPairIndex = afterIdx;
                    break;
                }
            }
            if (media.is_after && media.before_media?.images?.length && media.images?.length) {
                if (media.original_media?.url === currentImageUri) {
                    beforeImages = media.before_media.images;
                    afterImages = media.images;
                    currentPairIndex = 0;
                    break;
                }
                const afterIdx = media.images.findIndex((img: any) => img.image?.url === currentImageUri);
                if (afterIdx >= 0) {
                    beforeImages = media.before_media.images;
                    afterImages = media.images;
                    currentPairIndex = afterIdx;
                    break;
                }
            }
        }

        if (!beforeImages || !afterImages) {
            Alert.alert("Comparison not available", "Before/After comparison is only available for media with linked after images.");
            return;
        }

        const len = Math.min(beforeImages.length, afterImages.length);
        for (let i = 0; i < len; i++) {
            const beforeUrl = beforeImages[i].image?.url;
            const afterUrl = afterImages[i].image?.url;
            const beforeDate = (beforeImages[i] as any).created_at;
            const afterDate = (afterImages[i] as any).created_at;
            if (beforeUrl && afterUrl) pairs.push({ beforeUrl, afterUrl, beforeDate, afterDate });
        }

        if (pairs.length === 0) {
            Alert.alert("Comparison not available", "Before/After comparison is only available for media with linked after images.");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        setTimeout(() => {
            router.push({
                pathname: "/patients/compare" as any,
                params: {
                    patientId: String(patientId),
                    pairsJson: encodeURIComponent(JSON.stringify(pairs)),
                    currentIndex: String(currentPairIndex),
                },
            });
        }, 100);
    };

    const handleMagicPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = imagesList[displayIndex];
        setImageEditorUri(currentImageUri);
        setImageEditorTool("Magic");
        setImageEditorVisible(true);
    };

    const handleArchivePress = () => {
        const currentImageUri = imagesList[displayIndex];
        const mediaId = imageUrlToMediaIdMapInternal.get(currentImageUri);

        if (!mediaId) {
            Alert.alert("Error", "Could not find media ID for this image");
            return;
        }

        if (!patientId) {
            Alert.alert("Error", "Patient ID is required");
            return;
        }

        Alert.alert("Archive Image", "Are you sure you want to archive this image?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Archive",
                style: "destructive",
                onPress: () => {
                    archiveMedia({ patientId, mediaId });
                },
            },
        ]);
    };

    const handleRestorePress = () => {
        const currentImageUri = imagesList[displayIndex];
        if (onRestore) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRestore(currentImageUri);
        }
    };

    const handleTakeAfterTemplatePress = () => {
        if (!patientId) {
            Alert.alert("Error", "Patient ID is required");
            return;
        }

        const currentImageUri = imagesList[displayIndex];
        let templateId: string | number | undefined;
        let beforeMediaId: string | number | undefined;

        if (rawMediaData && Array.isArray(rawMediaData)) {
            for (const media of rawMediaData) {
                // Composite: original_media is the main image
                if (media.original_media?.url === currentImageUri && media.template?.id) {
                    templateId = media.template.id;
                    beforeMediaId = media.id;
                    break;
                }
                // Single photo with template (no original_media): first template image is the "main" one
                if (media.template?.id && !media.original_media?.url && media.images?.[0]?.image?.url === currentImageUri) {
                    templateId = media.template.id;
                    beforeMediaId = media.id;
                    break;
                }
            }
        }

        if (!templateId) {
            Alert.alert("Error", "Could not find template ID for this image");
            return;
        }

        if (!beforeMediaId) {
            Alert.alert("Error", "Could not find media ID for this image");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Close modal first
        onClose();

        // Navigate to camera after modal closes
        setTimeout(() => {
            router.push({
                pathname: "/camera" as any,
                params: {
                    patientId: String(patientId),
                    templateId: String(templateId),
                    beforeMediaId: String(beforeMediaId),
                },
            });
        }, 100);
    };

    const handleSharePress = async () => {
        const currentImageUri = imagesList[displayIndex];
        if (!currentImageUri) return;

        if (practice && metadata) {
            RNImage.getSize(
                currentImageUri,
                (imgWidth: number, imgHeight: number) => {
                    setShareCompositionImageLoaded(false);
                    setShareCompositionDimensions({ width: imgWidth, height: imgHeight });
                    setShareCompositionImageUri(currentImageUri);
                    setIsSharingComposition(true);
                },
                () => {
                    try {
                        Share.share({ url: currentImageUri });
                    } catch (err: any) {
                        if (err?.message !== "User did not share") Alert.alert("Error", "Failed to share image");
                    }
                },
            );
            return;
        }

        try {
            const patientName = `${patientData?.first_name || ""} ${patientData?.last_name || ""}`.trim();
            const message = `Patient photo${patientName ? ` - ${patientName}` : ""}\n\nImage link: ${currentImageUri}`;
            await Share.share({ message, url: currentImageUri });
        } catch (error: any) {
            console.error("Error sharing image:", error);
            if (error?.message !== "User did not share") {
                Alert.alert("Error", "Failed to share image");
            }
        }
    };

    const toggleControls = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setControlsVisible((prev) => !prev);
    };

    const handleImageLoad = (index: number, event: any) => {
        // Mark image as loaded
        setImageLoadingStates((prev) => {
            const newMap = new Map(prev);
            newMap.set(index, false);
            return newMap;
        });

        let imgWidth = 0;
        let imgHeight = 0;

        if (event?.source?.width && event?.source?.height) {
            imgWidth = event.source.width;
            imgHeight = event.source.height;
        } else if (event?.nativeEvent?.source?.width && event?.nativeEvent?.source?.height) {
            imgWidth = event.nativeEvent.source.width;
            imgHeight = event.nativeEvent.source.height;
        }

        if (imgWidth && imgHeight) {
            const imageAspectRatio = imgWidth / imgHeight;
            const screenAspectRatio = width / height;

            let displayWidth = width;
            let displayHeight = height;

            if (imageAspectRatio > screenAspectRatio) {
                displayHeight = width / imageAspectRatio;
            } else {
                displayWidth = height * imageAspectRatio;
            }

            setImageSizes((prev) => ({
                ...prev,
                [index]: { width: displayWidth, height: displayHeight },
            }));
        } else {
            setImageSizes((prev) => ({
                ...prev,
                [index]: { width: width, height: height },
            }));
        }
    };

    const handleImageLoadStart = (_index: number) => {
        // No loading state on main image – only thumbnails show loading
    };

    const handleImageError = (index: number) => {
        // Mark image as not loading (even if error, stop showing skeleton)
        setImageLoadingStates((prev) => {
            const newMap = new Map(prev);
            newMap.set(index, false);
            return newMap;
        });
    };

    const createGestures = (index: number) => {
        // Only enable gestures for the image being displayed (displayIndex = in sync with scroll)
        if (index !== displayIndex) {
            return Gesture.Tap();
        }

        const imageSize = imageSizes[index] || { width: width, height: height };

        const pinchGesture = Gesture.Pinch()
            .onStart(() => {
                savedScale.value = scale.value;
            })
            .onUpdate((e) => {
                scale.value = Math.max(1, Math.min(8, savedScale.value * e.scale));
            })
            .onEnd(() => {
                if (scale.value < 1) {
                    scale.value = withTiming(1, { duration: 200 });
                    runOnJS(setIsZoomed)(false);
                } else if (scale.value > 8) {
                    scale.value = withTiming(8, { duration: 200 });
                    runOnJS(setIsZoomed)(true);
                } else {
                    runOnJS(setIsZoomed)(scale.value > 1);
                }
            });

        const panGesture = Gesture.Pan()
            .manualActivation(true)
            .onTouchesDown((e, state) => {
                // Only activate pan gesture when zoomed
                if (scale.value > 1) {
                    state.activate();
                } else {
                    state.fail();
                }
            })
            .onTouchesMove((e, state) => {
                // Double check: fail if not zoomed
                if (scale.value <= 1) {
                    state.fail();
                    return;
                }
                // Ensure we're still zoomed before allowing pan
                state.activate();
            })
            .onStart(() => {
                if (scale.value > 1) {
                    savedTranslateX.value = translateX.value;
                    savedTranslateY.value = translateY.value;
                }
            })
            .onUpdate((e) => {
                if (scale.value > 1) {
                    // When zoomed, allow panning within image bounds (softer movement)
                    translateX.value = savedTranslateX.value + e.translationX * PAN_SENSITIVITY;
                    translateY.value = savedTranslateY.value + e.translationY * PAN_SENSITIVITY;
                }
            })
            .onEnd((e) => {
                if (scale.value > 1 && imageSize.width > 0 && imageSize.height > 0) {
                    // Handle pan when zoomed
                    const scaledWidth = imageSize.width * scale.value;
                    const scaledHeight = imageSize.height * scale.value;
                    const maxTranslateX = Math.max(0, (scaledWidth - width) / 2);
                    const maxTranslateY = Math.max(0, (scaledHeight - height) / 2);

                    if (maxTranslateX > 0 && Math.abs(translateX.value) > maxTranslateX) {
                        translateX.value = withTiming(Math.sign(translateX.value) * maxTranslateX, { duration: 200 });
                    }

                    if (maxTranslateY > 0 && Math.abs(translateY.value) > maxTranslateY) {
                        translateY.value = withTiming(Math.sign(translateY.value) * maxTranslateY, { duration: 200 });
                    }
                } else {
                    // When not zoomed, reset translation
                    translateX.value = withTiming(0, { duration: 200 });
                    translateY.value = withTiming(0, { duration: 200 });
                }
            });

        const doubleTapGesture = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd((e) => {
                if (scale.value > 1) {
                    scale.value = withTiming(1, { duration: 250 });
                    translateX.value = withTiming(0, { duration: 250 });
                    translateY.value = withTiming(0, { duration: 250 });
                    runOnJS(setIsZoomed)(false);
                } else {
                    // Zoom to 2x at tap location
                    const tapX = e.x - width / 2;
                    const tapY = e.y - height / 2;
                    scale.value = withTiming(2, { duration: 250 });
                    // Adjust translate to zoom towards tap point
                    translateX.value = withTiming(-tapX * 0.5, { duration: 250 });
                    translateY.value = withTiming(-tapY * 0.5, { duration: 250 });
                    runOnJS(setIsZoomed)(true);
                }
            });

        const singleTapGesture = Gesture.Tap()
            .numberOfTaps(1)
            .maxDuration(250)
            .onEnd(() => {
                // Always toggle controls, even when zoomed
                runOnJS(toggleControls)();
            });

        // Combine gestures with proper priorities:
        // - Pinch and pan work together when zoomed
        // - Tap gestures work independently
        // - FlatList handles horizontal swipe when not zoomed
        return Gesture.Simultaneous(Gesture.Simultaneous(pinchGesture, panGesture), Gesture.Exclusive(doubleTapGesture, singleTapGesture));
    };

    // Swipe down to dismiss (iPhone Photos style) - only when not zoomed
    const DISMISS_THRESHOLD = 55;
    const DISMISS_VELOCITY = 250;
    // Direction lock: fail as soon as horizontal move > 10px (FlatList gets touch); activate only when vertical down > 18px first
    const HORIZONTAL_FAIL_PX = 10;
    const VERTICAL_ACTIVATE_PX = 18;
    const touchStartX = useSharedValue(0);
    const touchStartY = useSharedValue(0);

    const dismissPanGesture = React.useMemo(
        () =>
            Gesture.Pan()
                .manualActivation(true)
                .onTouchesDown((e, state) => {
                    "worklet";
                    if (scale.value > 1) {
                        state.fail();
                        return;
                    }
                    const t = e.allTouches[0];
                    if (t) {
                        touchStartX.value = t.x;
                        touchStartY.value = t.y;
                    }
                })
                .onTouchesMove((e, state) => {
                    "worklet";
                    if (scale.value > 1) {
                        state.fail();
                        return;
                    }
                    const t = e.allTouches[0];
                    if (!t) return;
                    const dx = t.x - touchStartX.value;
                    const dy = t.y - touchStartY.value;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);
                    if (absDx > HORIZONTAL_FAIL_PX) {
                        state.fail();
                        return;
                    }
                    if (dy >= VERTICAL_ACTIVATE_PX && absDy >= absDx) {
                        state.activate();
                    }
                })
                .onUpdate((e) => {
                    "worklet";
                    if (scale.value > 1) return;
                    if (e.translationY <= 0) return;
                    const absX = Math.abs(e.translationX);
                    const absY = Math.abs(e.translationY);
                    if (absY >= absX) {
                        dismissTranslateY.value = Math.min(e.translationY, height * 1.2);
                    }
                })
                .onEnd((e) => {
                    "worklet";
                    const shouldDismiss = dismissTranslateY.value > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY;
                    if (shouldDismiss) {
                        dismissTranslateY.value = withTiming(height, { duration: 150 });
                        runOnJS(onClose)();
                    } else {
                        dismissTranslateY.value = withSpring(0, { damping: 20, stiffness: 300 });
                    }
                })
                .onFinalize(() => {
                    "worklet";
                    if (dismissTranslateY.value > 0 && dismissTranslateY.value < DISMISS_THRESHOLD) {
                        dismissTranslateY.value = withSpring(0, { damping: 20, stiffness: 300 });
                    }
                }),
        [onClose],
    );

    React.useEffect(() => {
        if (visible) dismissTranslateY.value = 0;
    }, [visible]);

    const dismissAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: dismissTranslateY.value }],
    }));

    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { translateX: translateX.value }, { translateY: translateY.value }],
        };
    });

    const renderImageItem = React.useCallback(
        ({ item, index }: { item: string; index: number }) => {
            const imageSize = imageSizes[index] ?? { width, height };
            const gestures = createGestures(index);
            const isCurrentImage = index === displayIndex;
            const isLoading = imageLoadingStates.get(index) ?? false;
            return (
                <ImageViewerItem
                    item={item}
                    index={index}
                    imageSize={imageSize}
                    gestures={gestures}
                    isCurrentImage={isCurrentImage}
                    imageAnimatedStyle={imageAnimatedStyle}
                    isLoading={isLoading}
                    onLoadStart={() => handleImageLoadStart(index)}
                    onLoad={(e) => handleImageLoad(index, e)}
                    onError={() => handleImageError(index)}
                />
            );
        },
        [
            displayIndex,
            imageSizes,
            imageLoadingStates,
            imageAnimatedStyle,
            createGestures,
            handleImageLoadStart,
            handleImageLoad,
            handleImageError,
        ],
    );

    const headerOpacity = useSharedValue(1);
    const bottomBarOpacity = useSharedValue(1);

    React.useEffect(() => {
        if (controlsVisible) {
            headerOpacity.value = withTiming(1, { duration: 200 });
            bottomBarOpacity.value = withTiming(1, { duration: 200 });
        } else {
            headerOpacity.value = withTiming(0, { duration: 200 });
            bottomBarOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [controlsVisible]);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value * headerContentOpacity.value,
        transform: [{ translateY: headerTranslateY.value }],
    }));

    const bottomBarAnimatedStyle = useAnimatedStyle(() => ({
        opacity: bottomBarOpacity.value,
    }));

    const bottomBarContentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: bottomBarContentOpacity.value,
        transform: [{ translateY: bottomBarContentTranslateY.value }],
    }));

    const notesCloseBarAnimatedStyle = useAnimatedStyle(() => ({
        opacity: notesCloseBarOpacity.value,
        transform: [{ translateY: notesCloseBarTranslateY.value }],
    }));

    const notesPanelAnimatedStyle = useAnimatedStyle(() => ({
        opacity: notesPanelOpacity.value,
        transform: [{ translateY: notesPanelTranslateY.value }],
    }));

    // Thumbnail strip: driven by thumbnailScrollX on UI thread for perfect sync with image swipe
    const thumbnailStripWidth = imagesList.length <= 0 ? width : THUMB_PADDING * 2 + imagesList.length * INACTIVE_THUMB_WIDTH + (imagesList.length - 1) * THUMB_GAP + ACTIVE_THUMB_MARGIN * 2 + (ACTIVE_THUMB_WIDTH - INACTIVE_THUMB_WIDTH);

    const thumbnailStripAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -thumbnailScrollX.value }],
    }));

    const bottomActionCount = React.useMemo(() => {
        return (showNote ? 1 : 0) + (showEdit ? 1 : 0) + (showCompare ? 1 : 0);
    }, [showNote, showEdit, showCompare]);

    const bottomActionWidth = React.useMemo(() => {
        return bottomActionCount === 0 ? containerSize : bottomActionCount === 1 ? containerSize : 44 * bottomActionCount + 12 * (bottomActionCount - 1);
    }, [bottomActionCount, containerSize]);

    // Memoize modifiers to prevent re-rendering glass effect
    const bottomActionModifiers = React.useMemo(() => {
        return [
            padding({ all: 0 }),
            frame({
                height: containerSize,
                alignment: "center",
                width: bottomActionWidth,
            }),
            glassEffect({
                glass: {
                    variant: "regular",
                },
            }),
        ];
    }, [containerSize, bottomActionWidth]);

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <GestureHandlerRootView style={styles.container}>
                <View style={styles.container}>
                    <GestureDetector gesture={dismissPanGesture}>
                        <Animated.View style={[styles.container, dismissAnimatedStyle]}>
                            {/* X button at top (same position as Back) - only when notes panel open */}
                            {notesPanelVisible && (
                                <Animated.View style={[styles.notesCloseBar, { paddingTop: insets.top }, notesCloseBarAnimatedStyle]} pointerEvents="box-none">
                                    <TouchableOpacity onPress={handleNotesPanelClose} style={styles.notesCloseButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
                                        <IconSymbol size={iconSize} name="xmark" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                            {/* Header - fades out when notes panel is open */}
                            <HeaderBar
                                paddingTop={insets.top}
                                headerAnimatedStyle={headerAnimatedStyle}
                                controlsVisible={controlsVisible}
                                notesPanelVisible={notesPanelVisible}
                                patientFullName={patientData?.full_name ?? ""}
                                description={description}
                                currentTaker={currentTaker ?? null}
                                currentCreatedAt={currentCreatedAt != null ? currentCreatedAt : undefined}
                                showShare={showShare}
                                showBookmark={showBookmark}
                                showNote={showNote}
                                showMagicInMore={showMagicInMore}
                                showCompare={showCompare}
                                showEditInMore={showEditInMore}
                                showArchiveInMore={showArchiveInMore}
                                showRestore={showRestore}
                                isBookmarked={localBookmarkMap.get(imagesList[displayIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[displayIndex]) ?? false}
                                isCurrentImageOriginalMedia={isCurrentImageOriginalMedia}
                                currentImageHasAfter={currentImageHasAfter}
                                enableTakeAfterTemplate={enableTakeAfterTemplate}
                                onClose={onClose}
                                onSharePress={handleSharePress}
                                onBookmarkPress={handleBookmarkPress}
                                onNotePress={handleNotePress}
                                onMagicPress={handleMagicPress}
                                onSplitPress={handleSplitPress}
                                onTakeAfterTemplatePress={handleTakeAfterTemplatePress}
                                onAdjustPress={handleAdjustPress}
                                onArchivePress={handleArchivePress}
                                onRestorePress={handleRestorePress}
                            />

                            {/* Note markers on image when notes panel open */}
                            <NotesOverlay
                                notesPanelVisible={notesPanelVisible}
                                notesForCurrentImage={notesForCurrentImage}
                                imageSizes={imageSizes}
                                displayIndex={displayIndex}
                                imageAnimatedStyle={imageAnimatedStyle}
                                selectedNoteId={selectedNoteId}
                                onSelectNote={setSelectedNoteId}
                            />

                            {/* Image Carousel */}
                            <ImageCarousel
                                flatListRef={flatListRef as any}
                                width={width}
                                imagePageWidth={IMAGE_PAGE_WIDTH}
                                data={imagesList}
                                initialIndex={initialIndex}
                                onScroll={handleScroll}
                                onMomentumScrollEnd={handleMomentumScrollEnd}
                                renderItem={renderImageItem}
                                scrollEnabled={!isZoomed}
                            />

                            {/* Bottom Bar: content always pinned to bottom so no layout jump when closing notes */}
                            <Animated.View style={[styles.bottomBar, { paddingBottom: (insets.bottom || 0) + 0 }, { minHeight: notesPanelVisible || isNotesClosing ? Math.min(height * 0.45, 320) : BOTTOM_BAR_CONTENT_HEIGHT }, bottomBarAnimatedStyle, !controlsVisible && styles.hidden]}>
                                <Animated.View style={[styles.bottomBarContentPinnedToBottom, bottomBarContentAnimatedStyle]} pointerEvents={notesPanelVisible ? "none" : "auto"}>
                                    {/* Thumbnail Gallery */}
                                    <ThumbnailStrip
                                        width={width}
                                        thumbnailStripWidth={thumbnailStripWidth}
                                        thumbnailStripAnimatedStyle={thumbnailStripAnimatedStyle}
                                        imagesList={imagesList}
                                        displayIndex={displayIndex}
                                        currentIndexShared={currentIndexShared}
                                        scrollProgress={scrollProgress}
                                        thumbnailLoadingStates={thumbnailLoadingStates}
                                        onThumbnailLoadStart={(imageUri) => {
                                            setThumbnailLoadingStates((prev) => {
                                                const newMap = new Map(prev);
                                                newMap.set(imageUri, true);
                                                return newMap;
                                            });
                                        }}
                                        onThumbnailLoad={(imageUri) => {
                                            setThumbnailLoadingStates((prev) => {
                                                const newMap = new Map(prev);
                                                newMap.set(imageUri, false);
                                                return newMap;
                                            });
                                        }}
                                        onThumbnailError={(imageUri) => {
                                            setThumbnailLoadingStates((prev) => {
                                                const newMap = new Map(prev);
                                                newMap.set(imageUri, false);
                                                return newMap;
                                            });
                                        }}
                                        onThumbnailPress={(index) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            scrollProgress.value = 0;
                                            isProgrammaticScroll.value = true;
                                            thumbnailScrollX.value = getThumbnailScrollXForPage(index, imagesList.length);
                                            currentIndexShared.value = index;
                                            setDisplayIndex(index);
                                            flatListRef.current?.scrollToIndex({ index, animated: true });
                                        }}
                                        isZoomed={isZoomed}
                                        notesPanelVisible={notesPanelVisible}
                                        thumbPadding={THUMB_PADDING}
                                    />

                                    {/* Action Buttons */}
                                    <BottomActionBar
                                        showShare={showShare}
                                        showNote={showNote}
                                        showEdit={showEdit}
                                        showCompare={showCompare}
                                        showBookmark={showBookmark}
                                        showRestore={showRestore}
                                        isBookmarked={localBookmarkMap.get(imagesList[displayIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[displayIndex]) ?? false}
                                        currentImageHasAfter={currentImageHasAfter}
                                        enableTakeAfterTemplate={enableTakeAfterTemplate}
                                        bottomActionModifiers={bottomActionModifiers}
                                        onSharePress={handleSharePress}
                                        onNotePress={handleNotePress}
                                        onSplitPress={handleSplitPress}
                                        onTakeAfterTemplatePress={handleTakeAfterTemplatePress}
                                        onAdjustPress={handleAdjustPress}
                                        onBookmarkPress={handleBookmarkPress}
                                        onRestorePress={handleRestorePress}
                                    />
                                </Animated.View>

                                {/* Notes panel (slides up from bottom) */}
                                <NotesPanelContainer
                                    notesPanelVisible={notesPanelVisible}
                                    notesPanelAnimatedStyle={notesPanelAnimatedStyle}
                                    imageUri={imagesList[displayIndex] ?? ""}
                                    notes={notesForCurrentImage}
                                    selectedNoteId={selectedNoteId}
                                    onSelectNote={setSelectedNoteId}
                                    onClose={handleNotesPanelClose}
                                    onEditPress={handleNotesPanelEditPress}
                                />
                            </Animated.View>
                        </Animated.View>
                    </GestureDetector>
                </View>

                {/* Hidden composition for Share: header + image (preserve ratio) + footer */}
                <ShareCompositionView
                    visible={!!(isSharingComposition && practice && metadata && shareCompositionImageUri && shareCompositionDimensions)}
                    width={width}
                    practice={practice}
                    metadata={metadata ?? undefined}
                    shareCompositionImageUri={shareCompositionImageUri}
                    shareCompositionDimensions={shareCompositionDimensions}
                    shareViewRef={shareViewRef}
                    printSettings={printSettings}
                    doctor={patientData?.doctor ?? null}
                    me={me ?? undefined}
                    onImageLoad={() => setShareCompositionImageLoaded(true)}
                />
            </GestureHandlerRootView>

            <ImageEditorModal
                visible={imageEditorVisible}
                uri={imageEditorUri}
                originalUri={imageEditorUri ? imageUrlToOriginalUriMapInternal.get(imageEditorUri) : undefined}
                initialTool={imageEditorTool}
                mediaId={imageEditorUri ? imageUrlToMediaIdMapInternal.get(imageEditorUri) : undefined}
                mediaImageId={imageEditorUri ? imageUrlToMediaImageIdMapInternal.get(imageEditorUri) : undefined}
                hasTemplate={imageEditorUri ? imageUrlToHasTemplateMapInternal.get(imageEditorUri) : undefined}
                initialEditorState={imageEditorUri ? (imageUrlToEditorStateMapInternal.get(imageEditorUri) ?? undefined) : undefined}
                onClose={() => setImageEditorVisible(false)}
                showOnlyNote={imageEditorTool === "Note" && isCurrentImageCompositeOriginal}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.black,
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: "hidden",
    },

    backButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    centerContent: {
        flex: 1,
        top: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: 200,
        alignSelf: "center",
    },
    textContainer: {
        gap: 0,
    },
    hidden: {
        pointerEvents: "none",
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    imageWrapper: {
        width,
        height,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        maxWidth: width,
        maxHeight: height,
    },
    imageLoading: {
        opacity: 0,
    },
    skeletonContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.system.black,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,

        zIndex: 10,
        overflow: "hidden",
    },
    /** When notes panel is open, pin bottom bar content to real bottom so slide-down animates from screen bottom */
    bottomBarContentPinnedToBottom: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
    },
    notesOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 15,
    },
    noteMarker: {
        position: "absolute",
        borderColor: colors.system.white,
        alignItems: "center",
        justifyContent: "center",
    },
    noteMarkerText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.system.white,
    },
    notesPanelWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 11,
    },
    notesCloseBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    notesCloseButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    thumbnailScroll: {
        marginBottom: 16,
    },
    /** When zoomed (and notes closed): hide thumbnail visually but keep in layout to avoid reflow lag */
    thumbnailHidden: {
        opacity: 0,
    },
    thumbnailContainer: {
        flexDirection: "row", // Center first/last thumbnails (active width / 2)
        alignItems: "center",
        paddingHorizontal: width / 2 - 22,
        gap: 4,
    },
    thumbnail: {
        height: 44,
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 0,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailImageLoading: {
        opacity: 0,
    },
    thumbnailSkeletonContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    actionButtonsContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    locationPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    menuButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    actionButton: {
        alignItems: "center",
        gap: 4,
        minWidth: 60,
    },
    pageIndicator: {
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
});
