import type { PracticeSettings } from "@/components";
import { PracticeDocumentFooter, PracticeDocumentHeader } from "@/components";
import { ImageEditorModal } from "@/components/ImageEditor";
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
import { Alert, Dimensions, Modal, Image as RNImage, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

const { width, height } = Dimensions.get("window");

// Softer pan when zoomed so image doesn't move too fast
const PAN_SENSITIVITY = 0.7;

import { MINT_COLOR } from "@/app/camera/_components/create-template/constants";
import { containerSize, iconSize } from "@/constants/theme";
import { IconSymbol } from "../ui/icon-symbol";
import { ViewerActionsConfig } from "./GalleryWithMenu";

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
        <View style={styles.imageWrapper}>
            <GestureDetector gesture={gestures as any}>
                <Animated.View style={[styles.imageContainer, isCurrentImage ? imageAnimatedStyle : null] as any}>
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

        // Smooth interpolation without bounce - iOS Photos style
        // Width: 24 (inactive) -> 44 (active)
        const width = withTiming(24 + activeProgress * 20, {
            duration: 150,
        });

        // Margin: 0 (inactive) -> 6 (active)
        const margin = withTiming(activeProgress * 6, {
            duration: 150,
        });

        // Scale: 0.95 (inactive) -> 1.0 (active) - subtle
        const scale = withTiming(0.95 + activeProgress * 0.05, {
            duration: 150,
        });

        // Opacity: 0.7 (inactive) -> 1.0 (active)
        const opacity = withTiming(0.7 + activeProgress * 0.3, {
            duration: 150,
        });

        return {
            width,
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
    actions = { showBookmark: true, showEdit: true, showArchive: true, showShare: true },
    rawMediaData,
    description = "taker",
    onRestore,
    practice,
    metadata,
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
    const thumbnailScrollRef = useRef<ScrollView>(null);
    const thumbnailScrollPosition = useRef(0);
    const isProgrammaticScroll = useSharedValue(false); // Changed to shared value for worklet access
    const lastThumbnailIndex = useRef(initialIndex);
    const thumbnailUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHandlingScrollEnd = useRef(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [imageSizes, setImageSizes] = useState<Record<number, { width: number; height: number }>>({});
    const [isZoomed, setIsZoomed] = useState(false);
    const [localBookmarkMap, setLocalBookmarkMap] = useState<Map<string, boolean>>(new Map());
    const [imageEditorVisible, setImageEditorVisible] = useState(false);
    const [imageEditorUri, setImageEditorUri] = useState<string | undefined>();
    const [imageEditorTool, setImageEditorTool] = useState<string | undefined>();
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

    // Get current patientId from currentIndex if imageUrlToPatientIdMap is provided
    const currentPatientId = React.useMemo(() => {
        if (imageUrlToPatientIdMap && imagesList.length > 0 && currentIndex >= 0 && currentIndex < imagesList.length) {
            const currentImageUrl = imagesList[currentIndex];
            return imageUrlToPatientIdMap.get(currentImageUrl) || patientId;
        }
        return patientId;
    }, [currentIndex, imagesList, imageUrlToPatientIdMap, patientId]);

    // Build maps from rawMediaData for taker, createdAt, isOriginalMedia, and hideTakeAfter
    const { imageUrlToTakerMapInternal, imageUrlToCreatedAtMapFromRaw, imageUrlToIsOriginalMediaMap, imageUrlToHideTakeAfterMap } = React.useMemo(() => {
        const takerMap = new Map<string, { first_name?: string | null; last_name?: string | null }>();
        const createdAtMap = new Map<string, string>();
        const isOriginalMediaMap = new Map<string, boolean>();
        const hideTakeAfterMap = new Map<string, boolean>();

        if (rawMediaData && Array.isArray(rawMediaData)) {
            rawMediaData.forEach((media: RawMediaData) => {
                const taker = media.taker;
                const createdAt = media.created_at;
                const hasTemplate = !!media.template;
                const hideTakeAfter = media.has_after === true || (media.is_after === true && media.before_media_id != null);

                // Add original_media to maps if it exists
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
                    // Mark as original_media if it has a template
                    if (hasTemplate) {
                        isOriginalMediaMap.set(media.original_media.url, true);
                        if (hideTakeAfter) {
                            hideTakeAfterMap.set(media.original_media.url, true);
                        }
                    }
                }

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
                            // Use image's created_at if available, otherwise use media's created_at
                            const imgCreatedAt = img.created_at || createdAt;
                            if (imgCreatedAt) {
                                createdAtMap.set(imageUrl, imgCreatedAt);
                            }
                            // Template images are NOT original_media
                            isOriginalMediaMap.set(imageUrl, false);
                            if (hideTakeAfter) {
                                hideTakeAfterMap.set(imageUrl, true);
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
        };
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

    // Get current taker info
    const currentTaker = React.useMemo(() => {
        if (imagesList.length > 0 && currentIndex >= 0 && currentIndex < imagesList.length) {
            const currentImageUrl = imagesList[currentIndex];
            return finalTakerMap.get(currentImageUrl);
        }
        return null;
    }, [currentIndex, imagesList, finalTakerMap]);

    // Get current createdAt
    const currentCreatedAt = React.useMemo(() => {
        if (imagesList.length > 0 && currentIndex >= 0 && currentIndex < imagesList.length) {
            const currentImageUrl = imagesList[currentIndex];
            return finalCreatedAtMap.get(currentImageUrl);
        }
        return null;
    }, [currentIndex, imagesList, finalCreatedAtMap]);

    // Check if current image is original_media from a template
    const isCurrentImageOriginalMedia = React.useMemo(() => {
        if (imagesList.length > 0 && currentIndex >= 0 && currentIndex < imagesList.length) {
            const currentImageUrl = imagesList[currentIndex];
            return imageUrlToIsOriginalMediaMap.get(currentImageUrl) === true;
        }
        return false;
    }, [currentIndex, imagesList, imageUrlToIsOriginalMediaMap]);

    // Hide "Take After Template" when has_after or (is_after + before_media_id)
    const isCurrentImageHideTakeAfter = React.useMemo(() => {
        if (imagesList.length > 0 && currentIndex >= 0 && currentIndex < imagesList.length) {
            const currentImageUrl = imagesList[currentIndex];
            return imageUrlToHideTakeAfterMap.get(currentImageUrl) === true;
        }
        return false;
    }, [currentIndex, imagesList, imageUrlToHideTakeAfterMap]);

    const showTakeAfterTemplate = isCurrentImageOriginalMedia && !isCurrentImageHideTakeAfter;

    // Adjust actions based on whether current image is original_media
    const effectiveActions = React.useMemo(() => {
        const { showShare: share = true, showRestore: restore = false } = actions;
        if (isCurrentImageOriginalMedia) {
            return {
                showBookmark: true,
                showEdit: true, // Show split icon (square.split.2x1) for original_media
                showArchive: true, // Archive to the right of split icon
                showShare: share,
                showRestore: restore,
                showMagic: false,
            };
        }
        return actions;
    }, [isCurrentImageOriginalMedia, actions]);

    // Destructure effective actions (for bottom buttons)
    const { showBookmark = true, showEdit = true, showArchive = true, showShare = true, showRestore = false, showMagic = false } = effectiveActions;

    // Destructure original actions (for more menu - Archive should remain in more menu)
    const { showArchive: showArchiveInMore = true, showEdit: showEditInMore = true, showMagic: showMagicInMore = false } = actions;

    // Fetch patient data if patientId is provided
    const { data: patientDataResponse } = useGetPatientById(currentPatientId || "");
    const patientData = patientDataResponse?.data;

    const scrollThumbnailToPosition = React.useCallback(
        (currentPage: number) => {
            if (!thumbnailScrollRef.current || imagesList.length === 0) return;

            const activeThumbnailWidth = 44;
            const inactiveThumbnailWidth = 24;
            const thumbnailGap = 4;
            const activeThumbnailMargin = 6;
            const padding = width / 2 - 22;

            // Get indices for interpolation
            const fromIndex = Math.floor(currentPage);
            const toIndex = Math.min(Math.ceil(currentPage), imagesList.length - 1);
            const progress = currentPage - fromIndex;

            // Calculate position for a specific index
            const getPositionForIndex = (idx: number) => {
                let pos = padding;
                for (let i = 0; i < idx; i++) {
                    pos += inactiveThumbnailWidth + thumbnailGap;
                }
                pos += activeThumbnailMargin + activeThumbnailWidth / 2;
                return pos;
            };

            // Interpolate between positions
            const fromPos = getPositionForIndex(fromIndex);
            const toPos = fromIndex === toIndex ? fromPos : getPositionForIndex(toIndex);
            const interpolatedPos = fromPos + (toPos - fromPos) * progress;

            // Center position
            const scrollX = interpolatedPos - width / 2;

            // Calculate max scroll
            const totalWidth = padding + imagesList.length * inactiveThumbnailWidth + (imagesList.length - 1) * thumbnailGap + activeThumbnailMargin + (activeThumbnailWidth - inactiveThumbnailWidth) + activeThumbnailMargin + padding;
            const maxScroll = Math.max(0, totalWidth - width);

            thumbnailScrollRef.current.scrollTo({
                x: Math.max(0, Math.min(scrollX, maxScroll)),
                animated: false,
            });
        },
        [imagesList.length, width],
    );

    const scrollThumbnailToIndex = React.useCallback(
        (index: number) => {
            if (!thumbnailScrollRef.current || imagesList.length === 0) return;

            // Simply use scrollThumbnailToPosition for consistency
            scrollThumbnailToPosition(index);
        },
        [imagesList.length, scrollThumbnailToPosition],
    );

    // Keep currentIndexShared and lastThumbnailIndex in sync with currentIndex
    React.useEffect(() => {
        currentIndexShared.value = currentIndex;
        lastThumbnailIndex.current = currentIndex;
    }, [currentIndex]);

    // Reset index to initialIndex when modal closes
    React.useEffect(() => {
        if (!visible) {
            // Reset to initial index when modal is closed
            setCurrentIndex(initialIndex);
            currentIndexShared.value = initialIndex;
            scale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
            setIsZoomed(false);
        }
    }, [visible, initialIndex]);

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

        // Mark new current image as loading when switching
        setImageLoadingStates((prev) => {
            const newMap = new Map(prev);
            if (!newMap.has(currentIndex)) {
                newMap.set(currentIndex, true);
            }
            return newMap;
        });

        // Immediately scroll thumbnail to center - instant with no animation
        scrollThumbnailToIndex(currentIndex);
    }, [currentIndex, scrollThumbnailToIndex]);

    const scrollThumbnailToPositionJS = React.useCallback(
        (currentPage: number) => {
            scrollThumbnailToPosition(currentPage);
        },
        [scrollThumbnailToPosition],
    );

    const handleScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            // Don't update during programmatic scrolls
            if (isProgrammaticScroll.value) {
                return;
            }

            const offsetX = event.contentOffset.x;
            const currentPage = offsetX / width;
            const clampedPage = Math.max(0, Math.min(currentPage, imagesList.length - 1));
            const index = Math.round(clampedPage);

            // Calculate progress for smooth thumbnail animation
            const progress = clampedPage - index;
            scrollProgress.value = progress;
            currentIndexShared.value = index;

            // Immediately scroll thumbnail - runs on UI thread for perfect sync
            if (clampedPage >= 0 && clampedPage < imagesList.length) {
                runOnJS(scrollThumbnailToPositionJS)(clampedPage);
            }
        },
    });

    const handleMomentumScrollEnd = (event: any) => {
        // Don't update if scroll is programmatic
        if (isProgrammaticScroll.value) {
            return;
        }

        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        const validIndex = Math.max(0, Math.min(index, imagesList.length - 1));

        // Reset scroll progress
        scrollProgress.value = withTiming(0, { duration: 150 });

        // Update index if changed
        if (validIndex !== currentIndex) {
            setCurrentIndex(validIndex);
            currentIndexShared.value = validIndex;
        }
    };

    const handleEditPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = imagesList[currentIndex];
        setImageEditorUri(currentImageUri);
        setImageEditorTool(undefined);
        setImageEditorVisible(true);
    };

    // Bookmark mutations
    const { mutate: bookmarkMedia } = useBookmarkMedia(
        () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Optimistically update local bookmark map
            const currentImageUri = imagesList[currentIndex];
            setLocalBookmarkMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentImageUri, true);
                return newMap;
            });
        },
        (error) => {
            console.error("Error bookmarking media:", error);
            Alert.alert("Error", error.message || "Failed to bookmark image");
            // Revert optimistic update on error
            const currentImageUri = imagesList[currentIndex];
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
            // Optimistically update local bookmark map
            const currentImageUri = imagesList[currentIndex];
            setLocalBookmarkMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(currentImageUri, false);
                return newMap;
            });
        },
        (error) => {
            console.error("Error unbookmarking media:", error);
            Alert.alert("Error", error.message || "Failed to unbookmark image");
            // Revert optimistic update on error
            const currentImageUri = imagesList[currentIndex];
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
    React.useEffect(() => {
        if (visible) {
            const initialLoadingStates = new Map<number, boolean>();
            const initialThumbnailLoadingStates = new Map<string, boolean>();
            imagesList.forEach((imageUri, index) => {
                initialLoadingStates.set(index, true);
                initialThumbnailLoadingStates.set(imageUri, true);
            });
            setImageLoadingStates(initialLoadingStates);
            setThumbnailLoadingStates(initialThumbnailLoadingStates);
        }
    }, [visible, imagesList.length]);

    const handleBookmarkPress = () => {
        const currentImageUri = imagesList[currentIndex];
        const mediaId = imageUrlToMediaIdMapInternal.get(currentImageUri);
        // Use local bookmark map first, fallback to internal map
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

    const handleAdjustPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = imagesList[currentIndex];
        setImageEditorUri(currentImageUri);
        setImageEditorTool("Adjust");
        setImageEditorVisible(true);
    };

    const handleMagicPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentImageUri = imagesList[currentIndex];
        setImageEditorUri(currentImageUri);
        setImageEditorTool("Magic");
        setImageEditorVisible(true);
    };

    const handleArchivePress = () => {
        const currentImageUri = imagesList[currentIndex];
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
        const currentImageUri = imagesList[currentIndex];
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

        // Find the template ID and before_media_id from rawMediaData for the current image
        const currentImageUri = imagesList[currentIndex];
        let templateId: string | number | undefined;
        let beforeMediaId: string | number | undefined;

        if (rawMediaData && Array.isArray(rawMediaData)) {
            for (const media of rawMediaData) {
                if (media.original_media?.url === currentImageUri && media.template?.id) {
                    templateId = media.template.id;
                    beforeMediaId = media.id; // Use media.id as before_media_id
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
        const currentImageUri = imagesList[currentIndex];
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

    const handleImageLoadStart = (index: number) => {
        // Mark image as loading
        setImageLoadingStates((prev) => {
            const newMap = new Map(prev);
            newMap.set(index, true);
            return newMap;
        });
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
        // Only enable gestures for current image
        if (index !== currentIndex) {
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
                // When not zoomed, don't interfere - let FlatList handle horizontal swipe
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

        return Gesture.Simultaneous(Gesture.Simultaneous(pinchGesture, panGesture), Gesture.Exclusive(doubleTapGesture, singleTapGesture));
    };

    // Swipe down to dismiss (iPhone Photos style) - only when not zoomed
    const DISMISS_THRESHOLD = 55;
    const DISMISS_VELOCITY = 250;
    const dismissPanGesture = React.useMemo(
        () =>
            Gesture.Pan()
                .manualActivation(true)
                .onTouchesDown((e, state) => {
                    // Only allow if not zoomed
                    if (scale.value > 1) {
                        state.fail();
                    }
                })
                .onTouchesMove((e, state) => {
                    if (scale.value > 1) {
                        state.fail();
                        return;
                    }

                    const touch = e.allTouches[0];
                    if (!touch) {
                        state.fail();
                        return;
                    }

                    const absX = Math.abs(touch.x);
                    const absY = Math.abs(touch.y);

                    // Only activate if:
                    // 1. Moving down (y > 0)
                    // 2. Vertical movement is at least 2x more than horizontal
                    // 3. Moved at least 20px vertically
                    if (touch.y > 20 && absY > absX * 2) {
                        state.activate();
                    }
                    // Fail if horizontal movement is dominant or moved left/right too much
                    else if (absX > 25 || (absX > absY && absX > 15)) {
                        state.fail();
                    }
                })
                .onUpdate((e) => {
                    // Only update if moving down and not zoomed
                    if (scale.value <= 1 && e.translationY > 0) {
                        // Extra safety: ensure vertical movement is still dominant
                        const absX = Math.abs(e.translationX);
                        const absY = Math.abs(e.translationY);

                        if (absY > absX * 1.5) {
                            dismissTranslateY.value = Math.min(e.translationY, height * 1.2);
                        }
                    }
                })
                .onEnd((e) => {
                    const shouldDismiss = dismissTranslateY.value > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY;
                    if (shouldDismiss) {
                        dismissTranslateY.value = withTiming(height, { duration: 150 });
                        runOnJS(onClose)();
                    } else {
                        dismissTranslateY.value = withSpring(0, { damping: 20, stiffness: 300 });
                    }
                })
                .onFinalize(() => {
                    // Always reset if not dismissing
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
        const isCurrentImage = index === currentIndex;
        const isLoading = imageLoadingStates.get(index) ?? true; // Default to loading

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
        opacity: headerOpacity.value,
    }));

    const bottomBarAnimatedStyle = useAnimatedStyle(() => ({
        opacity: bottomBarOpacity.value,
    }));

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
            <GestureHandlerRootView style={styles.container}>
                <View style={styles.container}>
                    <GestureDetector gesture={dismissPanGesture}>
                        <Animated.View style={[styles.container, dismissAnimatedStyle]}>
                            {/* Header */}
                            <Animated.View style={[{ paddingTop: insets.top }, styles.header, headerAnimatedStyle, !controlsVisible && styles.hidden]}>
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
                                                        <Button systemImage={(localBookmarkMap.get(imagesList[currentIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[currentIndex])) ? "heart.fill" : "heart"} onPress={handleBookmarkPress}>
                                                            {(localBookmarkMap.get(imagesList[currentIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[currentIndex])) ? "Remove Bookmark" : "Bookmark"}
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

                            {/* Image Carousel */}
                            <Animated.FlatList
                                ref={flatListRef}
                                horizontal
                                pagingEnabled={true}
                                initialScrollIndex={initialIndex}
                                data={imagesList}
                                keyExtractor={(_, i) => i.toString()}
                                onScroll={handleScroll}
                                onMomentumScrollEnd={handleMomentumScrollEnd}
                                scrollEventThrottle={1}
                                showsHorizontalScrollIndicator={false}
                                decelerationRate="fast"
                                renderItem={renderImageItem}
                                getItemLayout={(_, index) => ({
                                    length: width,
                                    offset: width * index,
                                    index,
                                })}
                                scrollEnabled={!isZoomed}
                                bounces={false}
                                removeClippedSubviews={true}
                                maxToRenderPerBatch={3}
                                windowSize={5}
                                initialNumToRender={3}
                            />

                            {/* Bottom Bar with Thumbnails and Actions */}
                            <Animated.View style={[styles.bottomBar, { paddingBottom: insets.bottom }, bottomBarAnimatedStyle, !controlsVisible && styles.hidden]}>
                                {/* Thumbnail Gallery - Hide when zoomed */}
                                {!isZoomed && (
                                    <ScrollView ref={thumbnailScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailContainer} style={styles.thumbnailScroll} scrollEnabled={true} scrollEventThrottle={16} decelerationRate="normal" bounces={false}>
                                        {imagesList.map((imageUri, index) => {
                                            const isThumbnailLoading = thumbnailLoadingStates.get(imageUri) ?? true;

                                            return (
                                                <ThumbnailItem
                                                    key={index}
                                                    imageUri={imageUri}
                                                    index={index}
                                                    isActive={index === currentIndex}
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
                                                        setCurrentIndex(index);
                                                        flatListRef.current?.scrollToIndex({ index, animated: true });
                                                        // Reset flag after animation completes (longer timeout to prevent handleScroll interference)
                                                        setTimeout(() => {
                                                            isProgrammaticScroll.value = false;
                                                        }, 500);
                                                    }}
                                                />
                                            );
                                        })}
                                    </ScrollView>
                                )}

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
                                            {(showBookmark || showEdit) && <Spacer />}
                                            {showTakeAfterTemplate && (
                                                <>
                                                    <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 0, vertical: 0 })]}>
                                                        <Button onPress={handleTakeAfterTemplatePress} variant="glassProminent" controlSize="large" color={MINT_COLOR}>
                                                            Take After Template
                                                        </Button>
                                                    </HStack>
                                                    <Spacer />
                                                </>
                                            )}

                                            {(showBookmark || showEdit) && (
                                                <HStack
                                                    alignment="center"
                                                    modifiers={[
                                                        padding({ all: 0 }),
                                                        frame({ height: containerSize, alignment: "center", width: showBookmark && showEdit ? 100 : containerSize }),
                                                        glassEffect({
                                                            glass: {
                                                                variant: "regular",
                                                            },
                                                        }),
                                                    ]}
                                                >
                                                    {showBookmark && (
                                                        <TouchableOpacity onPress={handleBookmarkPress} className="  relative items-center justify-center w-[44px] h-[44px]">
                                                            <IconSymbol size={iconSize} name={(localBookmarkMap.get(imagesList[currentIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[currentIndex])) ? "heart.fill" : "heart"} color={colors.system.white as any} style={{ bottom: -2, left: !showEdit ? 2.2 : 5 }} />
                                                        </TouchableOpacity>
                                                    )}
                                                    {showEdit && (
                                                        <TouchableOpacity onPress={isCurrentImageOriginalMedia ? () => {} : handleAdjustPress} className="w-[44px] h-[44px]  items-center justify-center">
                                                            <IconSymbol size={iconSize} name={isCurrentImageOriginalMedia ? "square.split.2x1" : "slider.horizontal.3"} color={colors.system.white as any} style={{ bottom: -2 }} />
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

            <ImageEditorModal visible={imageEditorVisible} uri={imageEditorUri} initialTool={imageEditorTool} onClose={() => setImageEditorVisible(false)} />
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
    },
    thumbnailScroll: {
        marginBottom: 6,
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
