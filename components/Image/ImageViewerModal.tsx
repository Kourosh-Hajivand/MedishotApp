import type { PracticeSettings } from "@/components";
import { PracticeDocumentFooter, PracticeDocumentHeader } from "@/components";
import { ImageEditorModal, parseEditorStateFromMediaData } from "@/components/ImageEditor";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useAuth } from "@/utils/hook/useAuth";
import { useBookmarkMedia, useDeletePatientMedia, useUnbookmarkMedia } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import type { Practice } from "@/utils/service/models/ResponseModels";
import { Button, ContextMenu, Host, HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Dimensions, Modal, Image as RNImage, Text as RNText, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
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

import { MINT_COLOR } from "@/app/camera/_components/create-template/constants";
import { containerSize, iconSize } from "@/constants/theme";
import { BlurView } from "expo-blur";
import { IconSymbol } from "../ui/icon-symbol";
import { ViewerActionsConfig } from "./GalleryWithMenu";
import { ImageViewerNotesPanel } from "./ImageViewerNotesPanel";

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

interface ThumbnailItemProps {
    imageUri: string;
    index: number;
    isActive: boolean;
    onPress: () => void;
    scrollProgress: ReturnType<typeof useSharedValue<number>>;
    currentIndexShared: ReturnType<typeof useSharedValue<number>>; // Shared value for worklet access
}

// Separate component for image item to properly use hooks
interface ImageViewerItemProps {
    item: string;
    index: number;
    imageSize: { width: number; height: number };
    gestures: ReturnType<typeof Gesture.Simultaneous> | ReturnType<typeof Gesture.Tap>;
    isCurrentImage: boolean;
    imageAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
    isLoading: boolean;
    onLoadStart: () => void;
    onLoad: (e: any) => void;
    onError: () => void;
}

const ImageViewerItem: React.FC<ImageViewerItemProps> = ({ item, index, imageSize, gestures, isCurrentImage, imageAnimatedStyle, isLoading, onLoadStart, onLoad, onError }) => {
    // Create shared values for this component (proper hooks usage)
    const [showSkeleton, setShowSkeleton] = React.useState(isLoading);
    const imageOpacity = useSharedValue(isLoading ? 0 : 1);
    const skeletonOpacity = useSharedValue(isLoading ? 1 : 0);
    const hasLoadedRef = React.useRef(false); // Track if image has been loaded at least once

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const imageOpacityAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    // Update shared values when loading state changes (only if not already loaded)
    React.useEffect(() => {
        if (isLoading && !hasLoadedRef.current) {
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    }, [isLoading]);

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    // Handlers that update shared values
    const handleLoadStart = () => {
        // Only show skeleton if image hasn't been loaded before
        if (!hasLoadedRef.current) {
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
        onLoadStart();
    };

    const handleLoad = (e: any) => {
        hasLoadedRef.current = true; // Mark as loaded
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
        onLoad(e);
    };

    const handleError = () => {
        hasLoadedRef.current = true; // Mark as loaded (even on error)
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
        onError();
    };

    return (
        <View style={styles.imageWrapper} collapsable={false}>
            <GestureDetector gesture={gestures as any}>
                <Animated.View style={[styles.imageContainer, isCurrentImage ? imageAnimatedStyle : null] as any} collapsable={false}>
                    {showSkeleton && (
                        <Animated.View style={[styles.skeletonContainer, { width: imageSize.width || width, height: imageSize.height || height }, skeletonAnimatedStyle]}>
                            <ImageSkeleton width={imageSize.width || width} height={imageSize.height || height} borderRadius={0} variant="rectangular" />
                        </Animated.View>
                    )}
                    <Animated.View style={imageOpacityAnimatedStyle}>
                        <Image
                            source={{ uri: item }}
                            style={[
                                styles.image,
                                imageSize.width > 0 && {
                                    width: imageSize.width,
                                    height: imageSize.height,
                                },
                            ]}
                            contentFit="contain"
                            onLoadStart={handleLoadStart}
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const ThumbnailItem: React.FC<ThumbnailItemProps & { isLoading?: boolean; onLoadStart?: () => void; onLoad?: () => void; onError?: () => void }> = ({ imageUri, index, isActive, onPress, scrollProgress, currentIndexShared, isLoading = true, onLoadStart, onLoad, onError }) => {
    // Create shared values for this component (proper hooks usage)
    const [showSkeleton, setShowSkeleton] = React.useState(isLoading);
    const thumbnailOpacity = useSharedValue(isLoading ? 0 : 1);
    const thumbnailSkeletonOpacity = useSharedValue(isLoading ? 1 : 0);
    const hasLoadedRef = React.useRef(false); // Track if thumbnail has been loaded at least once

    const animatedThumbnailStyle = useAnimatedStyle(() => {
        // Calculate active progress based on current index and scroll progress
        const currentIdx = currentIndexShared.value;
        const distance = index - currentIdx;
        const progress = scrollProgress.value;

        let activeProgress = 0; // 0 = inactive, 1 = fully active

        if (distance === 0) {
            // Current thumbnail - becomes less active as we drag away
            activeProgress = 1 - Math.abs(progress);
        } else if (distance === 1 && progress > 0) {
            // Next thumbnail (index = currentIdx + 1) - becomes active when dragging right
            activeProgress = progress;
        } else if (distance === -1 && progress < 0) {
            // Previous thumbnail (index = currentIdx - 1) - becomes active when dragging left
            activeProgress = Math.abs(progress);
        }

        // Clamp activeProgress between 0 and 1
        activeProgress = Math.max(0, Math.min(1, activeProgress));

        // Direct mapping – no withTiming – so thumbnail updates in same frame as scroll (instant sync)
        // Width: 24 (inactive) -> 44 (active)
        const w = 24 + activeProgress * 20;
        // Margin: 0 (inactive) -> 6 (active)
        const margin = activeProgress * 6;
        // Scale: 0.95 (inactive) -> 1.0 (active)
        const scale = 0.95 + activeProgress * 0.05;
        // Opacity: 0.7 (inactive) -> 1.0 (active)
        const opacity = 0.7 + activeProgress * 0.3;

        return {
            width: w,
            marginHorizontal: margin,
            transform: [{ scale }],
            opacity,
        };
    });

    const skeletonOpacityStyle = useAnimatedStyle(() => ({
        opacity: thumbnailSkeletonOpacity.value,
    }));

    const imageOpacityStyle = useAnimatedStyle(() => ({
        opacity: thumbnailOpacity.value,
    }));

    // Update shared values when loading state changes (only if not already loaded)
    React.useEffect(() => {
        if (isLoading && !hasLoadedRef.current) {
            setShowSkeleton(true);
            thumbnailOpacity.value = 0;
            thumbnailSkeletonOpacity.value = 1;
        }
    }, [isLoading]);

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    // Handlers that update shared values
    const handleLoadStart = () => {
        // Only show skeleton if thumbnail hasn't been loaded before
        if (!hasLoadedRef.current) {
            setShowSkeleton(true);
            thumbnailOpacity.value = 0;
            thumbnailSkeletonOpacity.value = 1;
        }
        onLoadStart?.();
    };

    const handleLoad = () => {
        hasLoadedRef.current = true; // Mark as loaded
        thumbnailSkeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        thumbnailOpacity.value = withTiming(1, { duration: 300 });
        onLoad?.();
    };

    const handleError = () => {
        hasLoadedRef.current = true; // Mark as loaded (even on error)
        thumbnailSkeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        thumbnailOpacity.value = withTiming(1, { duration: 300 });
        onError?.();
    };

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Animated.View style={[styles.thumbnail, animatedThumbnailStyle]}>
                {showSkeleton && (
                    <Animated.View style={[styles.thumbnailSkeletonContainer, skeletonOpacityStyle]}>
                        <ImageSkeleton width={44} height={44} borderRadius={8} variant="rounded" />
                    </Animated.View>
                )}
                <Animated.View style={imageOpacityStyle}>
                    <Image source={{ uri: imageUri }} style={styles.thumbnailImage} contentFit="cover" onLoadStart={handleLoadStart} onLoad={handleLoad} onError={handleError} />
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
};

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

    // Build maps from mediaData if provided, otherwise use legacy maps
    const { imageUrlToMediaIdMapInternal, imageUrlToBookmarkMapInternal, imageUrlToCreatedAtMapInternal, imagesList } = React.useMemo(() => {
        // If mediaData is provided, build maps from it
        if (mediaData && mediaData.length > 0) {
            const mediaIdMap = new Map<string, number | string>();
            const bookmarkMap = new Map<string, boolean>();
            const createdAtMap = new Map<string, string>();
            const imageUrls: string[] = [];

            mediaData.forEach((item) => {
                imageUrls.push(item.url);
                if (item.mediaId) {
                    mediaIdMap.set(item.url, item.mediaId);
                }
                if (item.isBookmarked !== undefined) {
                    bookmarkMap.set(item.url, item.isBookmarked);
                }
                if (item.createdAt) {
                    createdAtMap.set(item.url, item.createdAt);
                }
            });

            return {
                imageUrlToMediaIdMapInternal: mediaIdMap,
                imageUrlToBookmarkMapInternal: bookmarkMap,
                imageUrlToCreatedAtMapInternal: createdAtMap,
                imagesList: imageUrls,
            };
        }

        // Otherwise use legacy props
        return {
            imageUrlToMediaIdMapInternal: imageUrlToMediaIdMap || new Map(),
            imageUrlToBookmarkMapInternal: imageUrlToBookmarkMap || new Map(),
            imageUrlToCreatedAtMapInternal: imageUrlToCreatedAtMap || new Map(),
            imagesList: images,
        };
    }, [mediaData, images, imageUrlToMediaIdMap, imageUrlToBookmarkMap, imageUrlToCreatedAtMap]);

    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const isProgrammaticScroll = useSharedValue(false); // Changed to shared value for worklet access
    const lastThumbnailIndex = useRef(initialIndex);
    const thumbnailUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHandlingScrollEnd = useRef(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [displayIndex, setDisplayIndex] = useState(initialIndex); // Updates with scroll so header/Take After Template stay in sync
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

    // Build maps from rawMediaData for taker, createdAt, isOriginalMedia, hideTakeAfter, and originalWithNoBeforeAfter
    const { imageUrlToTakerMapInternal, imageUrlToCreatedAtMapFromRaw, imageUrlToIsOriginalMediaMap, imageUrlToHideTakeAfterMap, imageUrlToOriginalNoBeforeAfterMap } = React.useMemo(() => {
        const takerMap = new Map<string, { first_name?: string | null; last_name?: string | null }>();
        const createdAtMap = new Map<string, string>();
        const isOriginalMediaMap = new Map<string, boolean>();
        const hideTakeAfterMap = new Map<string, boolean>();
        const originalNoBeforeAfterMap = new Map<string, boolean>();

        if (rawMediaData && Array.isArray(rawMediaData)) {
            rawMediaData.forEach((media: RawMediaData) => {
                const taker = media.taker;
                const createdAt = media.created_at;
                const hasTemplate = !!media.template;
                const hideTakeAfter = media.has_after === true || (media.is_after === true && media.before_media_id != null);
                const noBeforeAfter = media.has_after !== true && media.before_media_id == null;

                // Add original_media to maps if it exists (composite template)
                if (media.original_media?.url) {
                    if (taker) {
                        takerMap.set(media.original_media.url, {
                            first_name: taker.first_name,
                            last_name: taker.last_name,
                        });
                    }
                    if (createdAt) {
                        createdAtMap.set(media.original_media.url, createdAt);
                    }
                    if (hasTemplate) {
                        isOriginalMediaMap.set(media.original_media.url, true);
                        if (hideTakeAfter) {
                            hideTakeAfterMap.set(media.original_media.url, true);
                        }
                        if (noBeforeAfter) {
                            originalNoBeforeAfterMap.set(media.original_media.url, true);
                        }
                    }
                }

                // Template but no original_media (single photo with template, e.g. id 190): treat first image as primary for Take After
                const hasTemplateNoOriginal = hasTemplate && !media.original_media?.url && media.images?.length;
                const primaryTemplateImageUrl = hasTemplateNoOriginal ? media.images?.[0]?.image?.url : null;

                // Add all template images to maps
                if (media.images && Array.isArray(media.images)) {
                    media.images.forEach((img: any) => {
                        const imageUrl = img.image?.url;
                        if (imageUrl) {
                            if (taker) {
                                takerMap.set(imageUrl, {
                                    first_name: taker.first_name,
                                    last_name: taker.last_name,
                                });
                            }
                            const imgCreatedAt = img.created_at || createdAt;
                            if (imgCreatedAt) {
                                createdAtMap.set(imageUrl, imgCreatedAt);
                            }
                            // First image when template has no original_media = same logic as composite (Take After, etc.)
                            if (primaryTemplateImageUrl && imageUrl === primaryTemplateImageUrl) {
                                isOriginalMediaMap.set(imageUrl, true);
                                if (hideTakeAfter) {
                                    hideTakeAfterMap.set(imageUrl, true);
                                }
                                if (noBeforeAfter) {
                                    originalNoBeforeAfterMap.set(imageUrl, true);
                                }
                            } else {
                                isOriginalMediaMap.set(imageUrl, false);
                                if (hideTakeAfter) {
                                    hideTakeAfterMap.set(imageUrl, true);
                                }
                            }
                        }
                    });
                }
            });
        }

        return {
            imageUrlToTakerMapInternal: takerMap,
            imageUrlToCreatedAtMapFromRaw: createdAtMap,
            imageUrlToIsOriginalMediaMap: isOriginalMediaMap,
            imageUrlToHideTakeAfterMap: hideTakeAfterMap,
            imageUrlToOriginalNoBeforeAfterMap: originalNoBeforeAfterMap,
        };
    }, [rawMediaData]);

    // Map image URL -> editor state (from media.data) for restoring edits when opening editor
    const imageUrlToEditorStateMapInternal = React.useMemo(() => {
        const map = new Map<string, ReturnType<typeof parseEditorStateFromMediaData>>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            const data = (media as { data?: unknown }).data;
            const editorState = parseEditorStateFromMediaData(data);
            if (!editorState) return;

            if (media.original_media?.url) {
                map.set(media.original_media.url, editorState);
            }
            if (media.images?.length) {
                media.images.forEach((img: { image?: { url?: string } | null }) => {
                    if (img.image?.url) map.set(img.image.url, editorState);
                });
            }
            const simpleMedia = media as { media?: { url?: string } };
            if (simpleMedia.media?.url) {
                map.set(simpleMedia.media.url, editorState);
            }
        });

        return map;
    }, [rawMediaData]);

    const imageUrlToOriginalUriMapInternal = React.useMemo(() => {
        const map = new Map<string, string>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            const orig = media.original_media?.url ?? (media as { media?: { url?: string } }).media?.url;
            if (media.original_media?.url) map.set(media.original_media.url, media.original_media.url);
            const withEdited = media as { edited_media?: { url?: string } };
            if (withEdited.edited_media?.url && orig) map.set(withEdited.edited_media.url, orig);
            if (media.images?.length) {
                media.images.forEach((img: { image?: { url?: string } | null; edited_image?: { url?: string } | null }) => {
                    if (img.image?.url) map.set(img.image.url, orig ?? img.image.url);
                    if (img.edited_image?.url) map.set(img.edited_image.url, orig ?? img.image?.url ?? img.edited_image.url);
                });
            }
            const simpleMedia = media as { media?: { url?: string } };
            if (simpleMedia.media?.url) map.set(simpleMedia.media.url, orig ?? simpleMedia.media.url);
        });

        return map;
    }, [rawMediaData]);

    // Merge taker maps (rawMediaData takes precedence)
    const finalTakerMap = React.useMemo(() => {
        const merged = new Map(imageUrlToTakerMap || []);
        imageUrlToTakerMapInternal.forEach((value, key) => {
            merged.set(key, value);
        });
        return merged;
    }, [imageUrlToTakerMap, imageUrlToTakerMapInternal]);

    // Merge createdAt maps (rawMediaData takes precedence)
    const finalCreatedAtMap = React.useMemo(() => {
        const merged = new Map(imageUrlToCreatedAtMap || []);
        imageUrlToCreatedAtMapFromRaw.forEach((value, key) => {
            merged.set(key, value);
        });
        return merged;
    }, [imageUrlToCreatedAtMap, imageUrlToCreatedAtMapFromRaw]);

    // Get current taker info (displayIndex = updates with scroll, no delay)
    const currentTaker = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return finalTakerMap.get(currentImageUrl);
        }
        return null;
    }, [displayIndex, imagesList, finalTakerMap]);

    // Get current createdAt
    const currentCreatedAt = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return finalCreatedAtMap.get(currentImageUrl);
        }
        return null;
    }, [displayIndex, imagesList, finalCreatedAtMap]);

    // Check if current image is original_media from a template
    const isCurrentImageOriginalMedia = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToIsOriginalMediaMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToIsOriginalMediaMap]);

    // Hide "Take After Template" when has_after or (is_after + before_media_id)
    const isCurrentImageHideTakeAfter = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToHideTakeAfterMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToHideTakeAfterMap]);

    // Original with no before/after (e.g. id 176): show split with + badge for take-after; no archive
    const isCurrentImageOriginalNoBeforeAfter = React.useMemo(() => {
        if (imagesList.length > 0 && displayIndex >= 0 && displayIndex < imagesList.length) {
            const currentImageUrl = imagesList[displayIndex];
            return imageUrlToOriginalNoBeforeAfterMap.get(currentImageUrl) === true;
        }
        return false;
    }, [displayIndex, imagesList, imageUrlToOriginalNoBeforeAfterMap]);

    // hasAfter = current image already has linked after (split tap → compare); !hasAfter = show + on split, tap → take after
    const currentImageHasAfter = isCurrentImageHideTakeAfter;

    // Adjust actions: original gets split icon only when showCompare (e.g. patient route); respect showEdit from parent (Album has showEdit: false)
    const effectiveActions = React.useMemo(() => {
        const { showShare: share = true, showRestore: restore = false, showArchive: archive = true, showBookmark: bookmark = true, showNote: note = false, showCompare: compare = false, showEdit: edit = true } = actions;
        if (isCurrentImageOriginalMedia) {
            return {
                showBookmark: bookmark,
                showEdit: edit,
                showArchive: archive,
                showShare: share,
                showRestore: restore,
                showMagic: false,
                showNote: note,
                showCompare: compare,
            };
        }
        return { ...actions, showCompare: actions.showCompare ?? false };
    }, [isCurrentImageOriginalMedia, isCurrentImageOriginalNoBeforeAfter, actions]);

    // Destructure effective actions (for bottom buttons)
    const { showBookmark = true, showEdit = true, showArchive = true, showShare = true, showRestore = false, showMagic = false, showNote = false, showCompare = false } = effectiveActions;

    // Destructure original actions (for more menu - Archive should remain in more menu)
    const { showArchive: showArchiveInMore = true, showEdit: showEditInMore = true, showMagic: showMagicInMore = false } = actions;

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

    const setDisplayIndexFromScroll = React.useCallback((idx: number) => {
        setDisplayIndex(idx);
    }, []);

    // Keep currentIndexShared and lastThumbnailIndex in sync with currentIndex
    React.useEffect(() => {
        currentIndexShared.value = currentIndex;
        lastThumbnailIndex.current = currentIndex;
    }, [currentIndex]);

    // Reset index to initialIndex when modal closes; sync thumbnail and displayIndex when modal opens
    React.useEffect(() => {
        if (!visible) {
            setCurrentIndex(initialIndex);
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

    // Reset zoom when changing images and scroll thumbnail
    React.useEffect(() => {
        scale.value = withTiming(1, { duration: 250 });
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        setIsZoomed(false);

        // Immediately scroll thumbnail to center - instant with no animation
        scrollThumbnailToIndex(currentIndex);
    }, [currentIndex, scrollThumbnailToIndex]);

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
                runOnJS(setDisplayIndexFromScroll)(index);
            },
        },
        [imagesList.length, setDisplayIndexFromScroll],
    );

    const handleMomentumScrollEnd = (event: any) => {
        // Don't update if scroll is programmatic
        if (isProgrammaticScroll.value) {
            return;
        }

        // Don't update if zoomed
        if (scale.value > 1) {
            return;
        }

        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / IMAGE_PAGE_WIDTH);
        const validIndex = Math.max(0, Math.min(index, imagesList.length - 1));

        // Reset scroll progress smoothly
        scrollProgress.value = withTiming(0, { duration: 200 });

        // Update index if changed
        if (validIndex !== currentIndex) {
            setCurrentIndex(validIndex);
            setDisplayIndex(validIndex);
            currentIndexShared.value = validIndex;
        }
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

    /** Notes from media.data.editor.notes for current image (for notes panel) */
    const notesForCurrentImage = React.useMemo(() => {
        const uri = imagesList[displayIndex];
        if (!uri) return [];
        const state = imageUrlToEditorStateMapInternal.get(uri);
        return state?.notes ?? [];
    }, [displayIndex, imagesList, imageUrlToEditorStateMapInternal]);

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
                (imgWidth, imgHeight) => {
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

    const renderImageItem = ({ item, index }: { item: string; index: number }) => {
        const imageSize = imageSizes[index] || { width: width, height: height };
        const gestures = createGestures(index);
        const isCurrentImage = index === displayIndex;
        const isLoading = imageLoadingStates.get(index) ?? false; // No loading on main image – only thumbnails

        return <ImageViewerItem item={item} index={index} imageSize={imageSize} gestures={gestures} isCurrentImage={isCurrentImage} imageAnimatedStyle={imageAnimatedStyle} isLoading={isLoading} onLoadStart={() => handleImageLoadStart(index)} onLoad={(e) => handleImageLoad(index, e)} onError={() => handleImageError(index)} />;
    };

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

    const bottomActionCount = (showBookmark ? 1 : 0) + (showNote ? 1 : 0) + (showEdit ? 1 : 0);
    const bottomActionWidth =
        bottomActionCount === 0 ? containerSize : bottomActionCount === 1 ? containerSize : 44 * bottomActionCount + 12 * (bottomActionCount - 1);

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
                            <Animated.View style={[{ paddingTop: insets.top }, styles.header, headerAnimatedStyle, !controlsVisible && styles.hidden]} pointerEvents={notesPanelVisible ? "none" : "auto"}>
                                <View style={styles.actionButtonsContainer}>
                                    <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                                        <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 20 })]}>
                                            <HStack
                                                alignment="center"
                                                modifiers={[
                                                    padding({ all: 0 }),
                                                    frame({ width: containerSize, height: containerSize }),
                                                    glassEffect({
                                                        glass: {
                                                            variant: "regular",
                                                        },
                                                    }),
                                                ]}
                                            >
                                                <TouchableOpacity onPress={onClose} className="w-[44px] h-[44px]  items-center justify-center">
                                                    <IconSymbol size={iconSize} name="chevron.left" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                                                </TouchableOpacity>
                                                {/* <Button modifiers={[frame({ width: 44, height: 44 }), padding({ all: 0 })]} systemImage="chevron.left" variant="plain" controlSize="regular" onPress={onClose} /> */}
                                            </HStack>
                                            <Spacer />
                                            <VStack
                                                alignment="center"
                                                modifiers={[
                                                    padding({ all: 4 }),
                                                    frame({ width: description === "taker" && currentTaker ? 200 : 150, height: containerSize }),
                                                    glassEffect({
                                                        glass: {
                                                            variant: "regular",
                                                        },
                                                    }),
                                                ]}
                                                spacing={4}
                                            >
                                                <Text size={14}>{patientData?.full_name ?? ""}</Text>
                                                {description === "taker" && currentTaker ? (
                                                    <Text weight="light" size={12}>
                                                        {`taken by DR.${`${currentTaker.first_name || ""} ${currentTaker.last_name || ""}`.trim()}`}
                                                    </Text>
                                                ) : description === "Date" && currentCreatedAt ? (
                                                    <Text weight="light" size={12}>
                                                        {getRelativeTime(currentCreatedAt)}
                                                    </Text>
                                                ) : null}
                                            </VStack>
                                            <Spacer />
                                            <ContextMenu>
                                                <ContextMenu.Items>
                                                    {showShare && (
                                                        <Button systemImage="square.and.arrow.up" onPress={handleSharePress}>
                                                            Share
                                                        </Button>
                                                    )}
                                                    {showBookmark && (
                                                        <Button systemImage={(localBookmarkMap.get(imagesList[displayIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[displayIndex])) ? "heart.fill" : "heart"} onPress={handleBookmarkPress}>
                                                            {(localBookmarkMap.get(imagesList[displayIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[displayIndex])) ? "remove from practice album" : "add to practice album"}
                                                        </Button>
                                                    )}
                                                    {showNote && (
                                                        <Button systemImage="note.text" onPress={handleNotePress}>
                                                            Note
                                                        </Button>
                                                    )}
                                                    {showMagicInMore && !isCurrentImageOriginalMedia && (
                                                        <Button systemImage="sparkles" onPress={handleMagicPress}>
                                                            Use Magic
                                                        </Button>
                                                    )}
                                                    {showEditInMore && !isCurrentImageOriginalMedia && (
                                                        <Button systemImage="slider.horizontal.3" onPress={handleAdjustPress}>
                                                            Adjustment
                                                        </Button>
                                                    )}
                                                    {showArchiveInMore && (
                                                        <Button systemImage="archivebox" role="destructive" onPress={handleArchivePress}>
                                                            Archive
                                                        </Button>
                                                    )}
                                                    {showRestore && (
                                                        <Button systemImage="arrow.uturn.backward" onPress={handleRestorePress}>
                                                            Restore
                                                        </Button>
                                                    )}
                                                </ContextMenu.Items>
                                                <ContextMenu.Trigger>
                                                    <HStack
                                                        alignment="center"
                                                        modifiers={[
                                                            padding({ all: 10 }),
                                                            frame({ width: containerSize, height: containerSize, alignment: "center" }),
                                                            glassEffect({
                                                                glass: {
                                                                    variant: "regular",
                                                                },
                                                            }),
                                                        ]}
                                                    >
                                                        {/* <Button modifiers={[frame({ width: 44, height: 44 }), padding({ all: 0 })]} variant="plain" controlSize="regular" onPress={() => {}}>
                                                        </Button> */}
                                                        <TouchableOpacity>
                                                            <IconSymbol size={iconSize} name="ellipsis" color={colors.system.white as any} style={{ left: 1 }} />
                                                        </TouchableOpacity>
                                                    </HStack>
                                                </ContextMenu.Trigger>
                                            </ContextMenu>
                                        </HStack>
                                    </Host>
                                </View>
                            </Animated.View>

                            {/* Note markers on image when notes panel open – same transform as image so pins stay on image when zoomed */}
                            {notesPanelVisible &&
                                notesForCurrentImage.length > 0 &&
                                (() => {
                                    const imageSize = imageSizes[displayIndex] || { width, height };
                                    const imageLeft = (width - imageSize.width) / 2;
                                    const imageTop = (height - imageSize.height) / 2;
                                    const MARKER_SIZE = 30;
                                    const MARKER_R = MARKER_SIZE / 2;
                                    return (
                                        <Animated.View style={[styles.notesOverlay, imageAnimatedStyle]} pointerEvents="box-none">
                                            {notesForCurrentImage.map((note, index) => {
                                                const px = imageLeft + note.x * imageSize.width - MARKER_R;
                                                const py = imageTop + note.y * imageSize.height - MARKER_R;
                                                const isActive = selectedNoteId === note.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={note.id}
                                                        style={[styles.noteMarker]}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setSelectedNoteId(note.id);
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <BlurView
                                                            intensity={80}
                                                            tint={isActive ? "light" : "dark"}
                                                            style={{
                                                                overflow: "hidden",
                                                                left: px,
                                                                top: py,
                                                                width: MARKER_SIZE,
                                                                height: MARKER_SIZE,
                                                                borderRadius: MARKER_R,
                                                                backgroundColor: isActive ? colors.system.blue : "transparent",
                                                                borderWidth: isActive ? 2 : 1.5,
                                                                borderColor: "white",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            <RNText style={styles.noteMarkerText}>{String(index + 1)}</RNText>
                                                        </BlurView>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </Animated.View>
                                    );
                                })()}

                            {/* Image Carousel */}
                            <Animated.FlatList
                                ref={flatListRef}
                                horizontal
                                pagingEnabled={false}
                                snapToInterval={IMAGE_PAGE_WIDTH}
                                snapToAlignment="start"
                                decelerationRate="fast"
                                initialScrollIndex={initialIndex}
                                data={imagesList}
                                keyExtractor={(_, i) => i.toString()}
                                onScroll={handleScroll}
                                onMomentumScrollEnd={handleMomentumScrollEnd}
                                scrollEventThrottle={1}
                                showsHorizontalScrollIndicator={false}
                                renderItem={renderImageItem}
                                ItemSeparatorComponent={() => <View style={{ width: IMAGE_GAP }} />}
                                getItemLayout={(_, index) => ({
                                    length: width,
                                    offset: index * IMAGE_PAGE_WIDTH,
                                    index,
                                })}
                                scrollEnabled={!isZoomed}
                                bounces={false}
                                removeClippedSubviews={false}
                                maxToRenderPerBatch={3}
                                windowSize={5}
                                initialNumToRender={3}
                            />

                            {/* Bottom Bar: content always pinned to bottom so no layout jump when closing notes */}
                            <Animated.View style={[styles.bottomBar, { paddingBottom: (insets.bottom || 0) + 40 }, { minHeight: notesPanelVisible || isNotesClosing ? Math.min(height * 0.45, 320) : BOTTOM_BAR_CONTENT_HEIGHT }, bottomBarAnimatedStyle, !controlsVisible && styles.hidden]}>
                                <Animated.View style={[styles.bottomBarContentPinnedToBottom, bottomBarContentAnimatedStyle]} pointerEvents={notesPanelVisible ? "none" : "auto"}>
                                    {/* Thumbnail Gallery - always in layout to avoid reflow lag; when zoomed only hide visually (opacity 0) */}
                                    <View style={[styles.thumbnailScroll, { overflow: "hidden", width }, isZoomed && !notesPanelVisible && styles.thumbnailHidden]} pointerEvents={isZoomed && !notesPanelVisible ? "none" : "auto"}>
                                        <Animated.View
                                            style={[
                                                {
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: THUMB_PADDING,
                                                    gap: THUMB_GAP,
                                                    width: thumbnailStripWidth,
                                                },
                                                thumbnailStripAnimatedStyle,
                                            ]}
                                        >
                                            {imagesList.map((imageUri, index) => {
                                                const isThumbnailLoading = thumbnailLoadingStates.get(imageUri) ?? true;

                                                return (
                                                    <ThumbnailItem
                                                        key={index}
                                                        imageUri={imageUri}
                                                        index={index}
                                                        isActive={index === displayIndex}
                                                        currentIndexShared={currentIndexShared}
                                                        scrollProgress={scrollProgress}
                                                        isLoading={isThumbnailLoading}
                                                        onLoadStart={() => {
                                                            setThumbnailLoadingStates((prev) => {
                                                                const newMap = new Map(prev);
                                                                newMap.set(imageUri, true);
                                                                return newMap;
                                                            });
                                                        }}
                                                        onLoad={() => {
                                                            setThumbnailLoadingStates((prev) => {
                                                                const newMap = new Map(prev);
                                                                newMap.set(imageUri, false);
                                                                return newMap;
                                                            });
                                                        }}
                                                        onError={() => {
                                                            setThumbnailLoadingStates((prev) => {
                                                                const newMap = new Map(prev);
                                                                newMap.set(imageUri, false);
                                                                return newMap;
                                                            });
                                                        }}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            scrollProgress.value = 0;
                                                            isProgrammaticScroll.value = true;
                                                            thumbnailScrollX.value = withTiming(getThumbnailScrollXForPage(index, imagesList.length), { duration: 300 });
                                                            setCurrentIndex(index);
                                                            setDisplayIndex(index);
                                                            flatListRef.current?.scrollToIndex({ index, animated: true });
                                                            setTimeout(() => {
                                                                isProgrammaticScroll.value = false;
                                                            }, 500);
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Animated.View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={styles.actionButtonsContainer}>
                                        <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                                            <HStack alignment="center" spacing={0} modifiers={[padding({ horizontal: 20 })]}>
                                                {showShare && (
                                                    <HStack
                                                        alignment="center"
                                                        modifiers={[
                                                            padding({ all: 0 }),
                                                            frame({ width: 48, height: 48, alignment: "center" }),
                                                            glassEffect({
                                                                glass: {
                                                                    variant: "regular",
                                                                },
                                                            }),
                                                        ]}
                                                    >
                                                        <TouchableOpacity onPress={handleSharePress} className="  w-[48px] h-[48px] items-center justify-center">
                                                            <IconSymbol size={iconSize} name="square.and.arrow.up" color={colors.system.white as any} style={{ bottom: 2 }} />
                                                        </TouchableOpacity>
                                                        {/* <Button modifiers={[frame({ width: 48, height: 48 }), padding({ all: 0 })]} systemImage="square.and.arrow.up" variant="plain" controlSize="regular" onPress={handleSharePress} /> */}
                                                    </HStack>
                                                )}
                                                {(showBookmark || showEdit || showNote) && <Spacer />}
                                                {(showBookmark || showEdit || showNote) && (
                                                    <HStack
                                                        alignment="center"
                                                        modifiers={[
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
                                                        ]}
                                                    >
                                                        {showNote && (
                                                            <TouchableOpacity onPress={handleNotePress} className="w-[44px] h-[44px]  items-center justify-center">
                                                                <IconSymbol size={iconSize} name="pin.circle" color={colors.system.white as any} style={{ bottom: -2, left: 8 }} />
                                                            </TouchableOpacity>
                                                        )}
                                                        {showBookmark && (
                                                            <TouchableOpacity onPress={handleBookmarkPress} className="relative items-center justify-center w-[44px] h-[44px]">
                                                                <IconSymbol
                                                                    size={iconSize}
                                                                    name={(localBookmarkMap.get(imagesList[displayIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[displayIndex])) ? "heart.fill" : "heart"}
                                                                    color={colors.system.white as any}
                                                                    style={{ bottom: -2, left: bottomActionCount === 1 ? 2 : 5 }}
                                                                />
                                                            </TouchableOpacity>
                                                        )}
                                                        {showEdit && (
                                                            <TouchableOpacity onPress={showCompare && isCurrentImageOriginalMedia ? (currentImageHasAfter ? handleSplitPress : enableTakeAfterTemplate ? handleTakeAfterTemplatePress : handleSplitPress) : handleAdjustPress} className="w-[44px] h-[44px] relative items-center justify-center">
                                                                <IconSymbol size={iconSize} name={showCompare && isCurrentImageOriginalMedia ? "square.split.2x1" : "slider.horizontal.3"} color={colors.system.white as any} style={{ bottom: -2 }} />
                                                                {showCompare && isCurrentImageOriginalMedia && !currentImageHasAfter && enableTakeAfterTemplate && (
                                                                    <View style={{ position: "absolute", top: 10, right: 4, backgroundColor: MINT_COLOR, borderRadius: 8, minWidth: 14, height: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 }}>
                                                                        <IconSymbol name="plus" size={10} color={colors.system.white as any} />
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        )}
                                                    </HStack>
                                                )}

                                                {showArchive && <Spacer />}
                                                {showArchive && (
                                                    <HStack
                                                        alignment="center"
                                                        modifiers={[
                                                            padding({ all: 0 }),
                                                            frame({ width: 48, height: containerSize }),
                                                            glassEffect({
                                                                glass: {
                                                                    variant: "regular",
                                                                },
                                                            }),
                                                        ]}
                                                    >
                                                        <TouchableOpacity onPress={handleArchivePress} className="w-[44px] h-[44px]  items-center justify-center">
                                                            <IconSymbol size={iconSize} name="archivebox" style={{ bottom: -2, left: 2 }} color={colors.system.white as any} />
                                                        </TouchableOpacity>
                                                    </HStack>
                                                )}
                                                {showRestore && <Spacer />}
                                                {showRestore && (
                                                    <HStack
                                                        alignment="center"
                                                        modifiers={[
                                                            padding({ all: 0 }),
                                                            frame({ width: 48, height: containerSize }),
                                                            glassEffect({
                                                                glass: {
                                                                    variant: "regular",
                                                                },
                                                            }),
                                                        ]}
                                                    >
                                                        <TouchableOpacity onPress={handleRestorePress} className="w-[44px] h-[44px]  items-center justify-center">
                                                            <IconSymbol size={iconSize} name="arrow.uturn.backward" color={colors.system.white as any} style={{ bottom: -2, left: 2 }} />
                                                        </TouchableOpacity>
                                                        {/* <Button modifiers={[frame({ width: 48, height: 48 }), padding({ all: 0 })]} systemImage="arrow.uturn.backward" variant="plain" controlSize="large" onPress={handleRestorePress} /> */}
                                                    </HStack>
                                                )}
                                            </HStack>
                                        </Host>
                                    </View>
                                </Animated.View>

                                {/* Notes panel (slides up from bottom) */}
                                {notesPanelVisible && (
                                    <Animated.View style={[styles.notesPanelWrapper, notesPanelAnimatedStyle]} pointerEvents="box-none">
                                        <ImageViewerNotesPanel visible onClose={handleNotesPanelClose} imageUri={imagesList[displayIndex] ?? ""} paddingBottom={0} notes={notesForCurrentImage} selectedNoteId={selectedNoteId} onSelectNote={setSelectedNoteId} onEditPress={handleNotesPanelEditPress} />
                                    </Animated.View>
                                )}
                            </Animated.View>
                        </Animated.View>
                    </GestureDetector>
                </View>

                {/* Hidden composition for Share: header + image (preserve ratio) + footer */}
                {isSharingComposition && practice && metadata && shareCompositionImageUri && shareCompositionDimensions && (
                    <View
                        style={{
                            position: "absolute",
                            left: -width * 2,
                            top: 0,
                            width: width,
                            overflow: "hidden",
                            backgroundColor: colors.system.white,
                        }}
                        pointerEvents="none"
                        collapsable={false}
                    >
                        <ViewShot ref={shareViewRef} style={{ width: width, backgroundColor: colors.system.white }}>
                            <View style={{ width: width, paddingHorizontal: 16, paddingTop: 16 }}>
                                <PracticeDocumentHeader practice={practice} printSettings={printSettings} doctor={patientData?.doctor ?? null} me={me ?? undefined} variant="document" />
                            </View>
                            <View
                                style={{
                                    width: width,
                                    paddingHorizontal: 16,
                                    paddingVertical: 16,
                                    backgroundColor: colors.system.white,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <View
                                    style={{
                                        width: width - 32,
                                        height: (width - 32) * (shareCompositionDimensions.height / shareCompositionDimensions.width),
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <RNImage
                                        source={{ uri: shareCompositionImageUri }}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                        }}
                                        resizeMode="contain"
                                        onLoad={() => {
                                            setShareCompositionImageLoaded(true);
                                        }}
                                        onError={() => {
                                            console.error("Failed to load share composition image");
                                            setShareCompositionImageLoaded(true);
                                        }}
                                    />
                                </View>
                            </View>
                            <View style={{ width: width, paddingHorizontal: 16, paddingBottom: 16 }}>
                                <PracticeDocumentFooter metadata={metadata} printSettings={printSettings} variant="document" />
                            </View>
                        </ViewShot>
                    </View>
                )}
            </GestureHandlerRootView>

            <ImageEditorModal
                visible={imageEditorVisible}
                uri={imageEditorUri}
                originalUri={imageEditorUri ? imageUrlToOriginalUriMapInternal.get(imageEditorUri) : undefined}
                initialTool={imageEditorTool}
                mediaId={imageEditorUri ? imageUrlToMediaIdMapInternal.get(imageEditorUri) : undefined}
                initialEditorState={imageEditorUri ? (imageUrlToEditorStateMapInternal.get(imageEditorUri) ?? undefined) : undefined}
                onClose={() => setImageEditorVisible(false)}
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
        bottom: 0,
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
        marginBottom: 24,
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
