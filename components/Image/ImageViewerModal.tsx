import { ImageEditorModal } from "@/components/ImageEditor";
import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useBookmarkMedia, useDeletePatientMedia, useUnbookmarkMedia } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import { Button, Host, HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import { Alert, Dimensions, Modal, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

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
    [key: string]: any;
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
}

interface ThumbnailItemProps {
    imageUri: string;
    index: number;
    isActive: boolean;
    onPress: () => void;
    scrollProgress: ReturnType<typeof useSharedValue<number>>;
    currentIndexShared: ReturnType<typeof useSharedValue<number>>; // Shared value for worklet access
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({ imageUri, index, isActive, onPress, scrollProgress, currentIndexShared }) => {
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

        // Interpolate width: 24 (inactive) -> 40 (active)
        const width = 24 + activeProgress * 16;
        // Interpolate margin: 0 (inactive) -> 4 (active)
        const margin = activeProgress * 4;

        return {
            width: width,
            marginHorizontal: margin,
        };
    });

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Animated.View style={[styles.thumbnail, animatedThumbnailStyle]}>
                <Image source={{ uri: imageUri }} style={styles.thumbnailImage} contentFit="cover" />
            </Animated.View>
        </TouchableOpacity>
    );
};

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ visible, images, initialIndex, onClose, mediaData, imageUrlToMediaIdMap, imageUrlToBookmarkMap, imageUrlToCreatedAtMap, patientId, imageUrlToPatientIdMap, imageUrlToTakerMap, actions = { showBookmark: true, showEdit: true, showArchive: true, showShare: true }, rawMediaData, description = "taker" }) => {
    const { showBookmark = true, showEdit = true, showArchive = true, showShare = true } = actions;

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
    const isProgrammaticScroll = useRef(false);
    const isThumbnailProgrammaticScroll = useRef(false);
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

    // Shared values for zoom and pan (only for current image)
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const scrollProgress = useSharedValue(0); // Progress of swipe: -1 to 1 (left to right)
    const currentIndexShared = useSharedValue(initialIndex); // Shared value for current index

    // Get current patientId from currentIndex if imageUrlToPatientIdMap is provided
    const currentPatientId = React.useMemo(() => {
        if (imageUrlToPatientIdMap && imagesList.length > 0 && currentIndex >= 0 && currentIndex < imagesList.length) {
            const currentImageUrl = imagesList[currentIndex];
            return imageUrlToPatientIdMap.get(currentImageUrl) || patientId;
        }
        return patientId;
    }, [currentIndex, imagesList, imageUrlToPatientIdMap, patientId]);

    // Build maps from rawMediaData for taker and createdAt
    const { imageUrlToTakerMapInternal, imageUrlToCreatedAtMapFromRaw } = React.useMemo(() => {
        const takerMap = new Map<string, { first_name?: string | null; last_name?: string | null }>();
        const createdAtMap = new Map<string, string>();

        if (rawMediaData && Array.isArray(rawMediaData)) {
            rawMediaData.forEach((media: RawMediaData) => {
                const taker = media.taker;
                const createdAt = media.created_at;

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
                        }
                    });
                }
            });
        }

        return {
            imageUrlToTakerMapInternal: takerMap,
            imageUrlToCreatedAtMapFromRaw: createdAtMap,
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

    // Fetch patient data if patientId is provided
    const { data: patientDataResponse } = useGetPatientById(currentPatientId || "");
    const patientData = patientDataResponse?.data;

    const scrollThumbnailToPosition = React.useCallback(
        (currentPage: number, animated: boolean = false) => {
            if (thumbnailScrollRef.current && imagesList.length > 0) {
                isThumbnailProgrammaticScroll.current = true;
                const activeThumbnailWidth = 40;
                const inactiveThumbnailWidth = 24;
                const thumbnailGap = 4;
                const activeThumbnailMargin = 4;
                const padding = width / 2 - 20;

                // Calculate which thumbnail is currently active (rounded)
                const roundedIndex = Math.round(currentPage);
                const fromIndex = Math.floor(currentPage);
                const toIndex = Math.min(Math.ceil(currentPage), imagesList.length - 1);
                const progress = currentPage - fromIndex;

                // Calculate center position for each thumbnail index
                // Use currentIndex to determine which thumbnails are active
                const getThumbnailCenter = (idx: number, isActive: boolean) => {
                    let position = padding;
                    for (let i = 0; i < idx; i++) {
                        const prevIsActive = i === currentIndex;
                        const prevMargin = prevIsActive ? activeThumbnailMargin : 0;
                        const prevWidth = prevIsActive ? activeThumbnailWidth : inactiveThumbnailWidth;
                        position += prevMargin + prevWidth + prevMargin + thumbnailGap;
                    }
                    const thumbMargin = isActive ? activeThumbnailMargin : 0;
                    const thumbWidth = isActive ? activeThumbnailWidth : inactiveThumbnailWidth;
                    position += thumbMargin + thumbWidth / 2;
                    return position;
                };

                // Interpolate smoothly between two adjacent thumbnails for iOS Photos-like smooth scrolling
                const fromPosition = getThumbnailCenter(fromIndex, fromIndex === roundedIndex);
                const toPosition = fromIndex === toIndex ? fromPosition : getThumbnailCenter(toIndex, toIndex === roundedIndex);

                // Interpolate smoothly between positions
                const thumbnailCenterPosition = fromPosition + (toPosition - fromPosition) * progress;

                // Calculate scroll position to center the thumbnail perfectly
                const scrollPosition = thumbnailCenterPosition - width / 2;

                // Calculate total width for max scroll
                let totalWidth = padding;
                for (let i = 0; i < imagesList.length; i++) {
                    const isActive = i === currentIndex;
                    if (isActive) {
                        totalWidth += activeThumbnailMargin + activeThumbnailWidth + activeThumbnailMargin + thumbnailGap;
                    } else {
                        totalWidth += inactiveThumbnailWidth + thumbnailGap;
                    }
                }
                totalWidth -= thumbnailGap;
                totalWidth += padding;
                const maxScroll = Math.max(0, totalWidth - width);

                thumbnailScrollRef.current.scrollTo({
                    x: Math.max(0, Math.min(scrollPosition, maxScroll)),
                    animated,
                });

                if (animated) {
                    setTimeout(() => {
                        isThumbnailProgrammaticScroll.current = false;
                    }, 300);
                } else {
                    setTimeout(() => {
                        isThumbnailProgrammaticScroll.current = false;
                    }, 50);
                }
            }
        },
        [imagesList.length, currentIndex, width],
    );

    const scrollThumbnailToIndex = React.useCallback(
        (index: number, animated: boolean = true) => {
            if (thumbnailScrollRef.current && imagesList.length > 0) {
                isThumbnailProgrammaticScroll.current = true;
                const activeThumbnailWidth = 40;
                const inactiveThumbnailWidth = 24;
                const thumbnailGap = 4;
                const activeThumbnailMargin = 4;
                const padding = width / 2 - 20; // Center padding

                // Calculate target center position for the thumbnail at index
                // Always center the selected thumbnail perfectly
                let targetCenterPosition = padding;
                for (let i = 0; i < index; i++) {
                    // Use current index to determine if previous thumbnails are active
                    const prevIsActive = i === currentIndex;
                    if (prevIsActive) {
                        targetCenterPosition += activeThumbnailMargin + activeThumbnailWidth + activeThumbnailMargin + thumbnailGap;
                    } else {
                        targetCenterPosition += inactiveThumbnailWidth + thumbnailGap;
                    }
                }
                // Add margin and half width for the target thumbnail (always active when scrolling to it)
                targetCenterPosition += activeThumbnailMargin + activeThumbnailWidth / 2;

                // Calculate target scroll position to center the thumbnail perfectly
                const targetScrollPosition = targetCenterPosition - width / 2;

                // Calculate total width for max scroll
                let totalWidth = padding;
                for (let i = 0; i < imagesList.length; i++) {
                    const isActive = i === index;
                    if (isActive) {
                        totalWidth += activeThumbnailMargin + activeThumbnailWidth + activeThumbnailMargin + thumbnailGap;
                    } else {
                        totalWidth += inactiveThumbnailWidth + thumbnailGap;
                    }
                }
                totalWidth -= thumbnailGap;
                totalWidth += padding;
                const maxScroll = Math.max(0, totalWidth - width);

                const finalScrollPosition = Math.max(0, Math.min(targetScrollPosition, maxScroll));

                thumbnailScrollRef.current.scrollTo({
                    x: finalScrollPosition,
                    animated,
                });

                if (animated) {
                    // Smooth animation matching iOS Photos app
                    setTimeout(() => {
                        isThumbnailProgrammaticScroll.current = false;
                    }, 350);
                } else {
                    setTimeout(() => {
                        isThumbnailProgrammaticScroll.current = false;
                    }, 50);
                }
            }
        },
        [imagesList.length, currentIndex, width],
    );

    // Keep currentIndexShared and lastThumbnailIndex in sync with currentIndex
    React.useEffect(() => {
        currentIndexShared.value = currentIndex;
        lastThumbnailIndex.current = currentIndex;
    }, [currentIndex]);

    // Reset zoom when changing images and scroll thumbnail
    React.useEffect(() => {
        scale.value = withTiming(1, { duration: 250 });
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        setIsZoomed(false);

        // Scroll thumbnail to center current image - iOS Photos-like smooth behavior
        // Always keep the selected image centered in thumbnail bar
        setTimeout(() => {
            scrollThumbnailToIndex(currentIndex, true);
        }, 100);
    }, [currentIndex, scrollThumbnailToIndex]);

    const handleScroll = (event: any) => {
        // Don't update index if scroll is programmatic (from thumbnail click)
        if (isProgrammaticScroll.current) {
            scrollProgress.value = 0;
            return;
        }
        const offsetX = event.nativeEvent.contentOffset.x;
        const currentPage = offsetX / width;
        
        // Clamp currentPage to valid range
        const clampedPage = Math.max(0, Math.min(currentPage, imagesList.length - 1));
        const index = Math.round(clampedPage);

        // Calculate scroll progress: -1 (swiping left) to 1 (swiping right)
        const progress = clampedPage - index;
        scrollProgress.value = progress;

        // Update currentIndexShared to current rounded index
        // ThumbnailItem will calculate which thumbnail should be active based on progress
        currentIndexShared.value = index;

        // Smoothly scroll thumbnail gallery to match exact current position (including fractional part)
        // This creates perfectly smooth iOS Photos-like animation during drag
        if (clampedPage >= 0 && clampedPage < imagesList.length) {
            scrollThumbnailToPosition(clampedPage, false);
        }
    };

    const handleThumbnailScroll = (event: any) => {
        // Update scroll position ref
        thumbnailScrollPosition.current = event.nativeEvent.contentOffset.x;

        // Don't update index if scroll is programmatic (from useEffect)
        if (isThumbnailProgrammaticScroll.current) {
            return;
        }

        // During drag, only track position - don't update image
        // This allows free smooth dragging without interference
        // Image will be updated in handleThumbnailScrollEnd
    };

    const handleThumbnailScrollEnd = (event: any) => {
        // Don't update index if scroll is programmatic (from useEffect)
        if (isThumbnailProgrammaticScroll.current) {
            return;
        }

        // Find which thumbnail is at center after drag ends and update image
        const scrollX = event.nativeEvent.contentOffset.x;
        const activeThumbnailWidth = 40;
        const inactiveThumbnailWidth = 24;
        const thumbnailGap = 4;
        const activeThumbnailMargin = 4;
        const centerX = scrollX + width / 2;
        const padding = width / 2 - 20;

        // Find which thumbnail is at center after drag ends
        let currentWidth = padding;
        for (let i = 0; i < imagesList.length; i++) {
            const isActive = i === currentIndex;
            const thumbWidth = isActive ? activeThumbnailWidth : inactiveThumbnailWidth;
            const thumbMargin = isActive ? activeThumbnailMargin : 0;
            const thumbStart = currentWidth + thumbMargin;
            const thumbEnd = currentWidth + thumbMargin + thumbWidth;

            if (centerX >= thumbStart && centerX <= thumbEnd) {
                if (i !== currentIndex) {
                    // Update to the thumbnail that's at center after drag ends
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    isProgrammaticScroll.current = true;
                    setCurrentIndex(i);
                    currentIndexShared.value = i;
                    flatListRef.current?.scrollToIndex({ index: i, animated: true });
                    setTimeout(() => {
                        isProgrammaticScroll.current = false;
                    }, 500);
                }
                break;
            }
            // Move to next thumbnail position
            if (isActive) {
                currentWidth += activeThumbnailMargin + thumbWidth + activeThumbnailMargin + thumbnailGap;
            } else {
                currentWidth += thumbWidth + thumbnailGap;
            }
        }
    };

    const handleScrollEndDrag = (event: any) => {
        // Don't update index if scroll is programmatic
        if (isProgrammaticScroll.current || isHandlingScrollEnd.current) {
            return;
        }
        
        const offsetX = event.nativeEvent.contentOffset.x;
        const currentPage = offsetX / width;
        
        // Clamp to valid range
        const clampedPage = Math.max(0, Math.min(currentPage, imagesList.length - 1));
        
        // Calculate progress relative to current index
        // Positive = swiping right (next image), Negative = swiping left (previous image)
        const progress = clampedPage - currentIndex;
        
        // iOS Photos-like threshold: if less than 30% swiped, snap back to current image
        // If more than 30%, snap to next/previous image
        const SNAP_THRESHOLD = 0.3;
        let targetIndex: number;
        
        // Determine target index based on swipe direction and progress
        if (progress < -SNAP_THRESHOLD && currentIndex > 0) {
            // Swiping left (to previous image) - more than threshold swiped
            targetIndex = Math.max(0, currentIndex - 1);
        } else if (progress > SNAP_THRESHOLD && currentIndex < imagesList.length - 1) {
            // Swiping right (to next image) - more than threshold swiped
            targetIndex = Math.min(imagesList.length - 1, currentIndex + 1);
        } else {
            // Less than threshold swiped - snap back to current image
            targetIndex = currentIndex;
        }
        
        // Ensure targetIndex is valid
        targetIndex = Math.max(0, Math.min(targetIndex, imagesList.length - 1));
        
        // Reset scroll progress with smooth animation
        scrollProgress.value = withTiming(0, { duration: 300 });
        
        // Only update if target is different from current
        if (targetIndex !== currentIndex) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            isHandlingScrollEnd.current = true;
            isProgrammaticScroll.current = true;
            setCurrentIndex(targetIndex);
            currentIndexShared.value = targetIndex;
            flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
            scrollThumbnailToIndex(targetIndex, true);
            setTimeout(() => {
                isProgrammaticScroll.current = false;
                isHandlingScrollEnd.current = false;
            }, 400);
        } else {
            // Snap back to current image smoothly
            isHandlingScrollEnd.current = true;
            isProgrammaticScroll.current = true;
            flatListRef.current?.scrollToIndex({ index: currentIndex, animated: true });
            scrollThumbnailToIndex(currentIndex, true);
            setTimeout(() => {
                isProgrammaticScroll.current = false;
                isHandlingScrollEnd.current = false;
            }, 400);
        }
    };

    const handleMomentumScrollEnd = (event: any) => {
        // Don't update index if scroll is programmatic or if we already handled scroll end
        if (isProgrammaticScroll.current || isHandlingScrollEnd.current) {
            return;
        }
        
        const offsetX = event.nativeEvent.contentOffset.x;
        const currentPage = offsetX / width;
        
        // Clamp to valid range
        const clampedPage = Math.max(0, Math.min(currentPage, imagesList.length - 1));
        const index = Math.round(clampedPage);
        
        // Ensure index is valid
        const validIndex = Math.max(0, Math.min(index, imagesList.length - 1));
        
        scrollProgress.value = withTiming(0, { duration: 200 }); // Smoothly reset progress

        if (validIndex !== currentIndex) {
            isHandlingScrollEnd.current = true;
            isProgrammaticScroll.current = true;
            setCurrentIndex(validIndex);
            currentIndexShared.value = validIndex;
            // Smoothly scroll thumbnail gallery to final position
            scrollThumbnailToIndex(validIndex, true);
            setTimeout(() => {
                isProgrammaticScroll.current = false;
                isHandlingScrollEnd.current = false;
            }, 500);
        } else {
            // Even if index didn't change, ensure thumbnail is centered
            scrollThumbnailToIndex(validIndex, true);
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

    const handleSharePress = async () => {
        const currentImageUri = imagesList[currentIndex];
        try {
            const patientName = `${patientData?.first_name || ""} ${patientData?.last_name || ""}`.trim();
            const message = `Patient photo${patientName ? ` - ${patientName}` : ""}\n\nImage link: ${currentImageUri}`;

            await Share.share({
                message: message,
                url: currentImageUri,
            });
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
                scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
            })
            .onEnd(() => {
                if (scale.value < 1) {
                    scale.value = withTiming(1, { duration: 200 });
                    runOnJS(setIsZoomed)(false);
                } else if (scale.value > 4) {
                    scale.value = withTiming(4, { duration: 200 });
                    runOnJS(setIsZoomed)(true);
                } else {
                    runOnJS(setIsZoomed)(scale.value > 1);
                }
            });

        const panGesture = Gesture.Pan()
            .activeOffsetY([-10, 10])
            .failOffsetX([-50, 50]) // Fail horizontal pan when not zoomed - allow FlatList to handle swipe
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
                    // When zoomed, allow panning within image bounds
                    translateX.value = savedTranslateX.value + e.translationX;
                    translateY.value = savedTranslateY.value + e.translationY;
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
                    } else if (Math.abs(translateX.value) > width / 2) {
                        translateX.value = withTiming(0, { duration: 200 });
                    }

                    if (maxTranslateY > 0 && Math.abs(translateY.value) > maxTranslateY) {
                        translateY.value = withTiming(Math.sign(translateY.value) * maxTranslateY, { duration: 200 });
                    } else if (Math.abs(translateY.value) > height / 2) {
                        translateY.value = withTiming(0, { duration: 200 });
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

    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { translateX: translateX.value }, { translateY: translateY.value }],
        };
    });

    const renderImageItem = ({ item, index }: { item: string; index: number }) => {
        const imageSize = imageSizes[index] || { width: width, height: height };
        const gestures = createGestures(index);
        const isCurrentImage = index === currentIndex;

        return (
            <View style={styles.imageWrapper}>
                <GestureDetector gesture={gestures}>
                    <Animated.View style={[styles.imageContainer, isCurrentImage && imageAnimatedStyle]}>
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
                            onLoad={(e) => handleImageLoad(index, e)}
                        />
                    </Animated.View>
                </GestureDetector>
            </View>
        );
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
                    {/* Header */}
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={[{ paddingTop: insets.top }, styles.header, headerAnimatedStyle, !controlsVisible && styles.hidden]}>
                        <View style={styles.actionButtonsContainer}>
                            <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                                <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 20 })]}>
                                    <HStack
                                        alignment="center"
                                        modifiers={[
                                            padding({ all: 0 }),
                                            frame({ width: 44, height: 44 }),
                                            glassEffect({
                                                glass: {
                                                    variant: "regular",
                                                },
                                            }),
                                        ]}
                                    >
                                        <Button modifiers={[frame({ width: 44, height: 44 }), padding({ all: 0 })]} systemImage="chevron.left" variant="plain" controlSize="regular" onPress={onClose} />
                                    </HStack>
                                    <Spacer />
                                    <VStack
                                        alignment="center"
                                        modifiers={[
                                            padding({ all: 4 }),
                                            frame({ width: (description === "taker" && currentTaker) ? 200 : 150 }),
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
                                    <HStack
                                        alignment="center"
                                        modifiers={[
                                            padding({ all: 0 }),
                                            frame({ width: 44, height: 44 }),
                                            glassEffect({
                                                glass: {
                                                    variant: "regular",
                                                },
                                            }),
                                        ]}
                                    >
                                        <Button modifiers={[frame({ width: 44, height: 44 }), padding({ all: 0 })]} systemImage="ellipsis" variant="plain" controlSize="regular" onPress={() => {}} />
                                    </HStack>
                                </HStack>
                            </Host>
                        </View>
                    </Animated.View>

                    {/* Image Carousel */}
                    <FlatList
                        ref={flatListRef}
                        horizontal
                        pagingEnabled={true}
                        initialScrollIndex={initialIndex}
                        data={imagesList}
                        keyExtractor={(_, i) => i.toString()}
                        onScroll={handleScroll}
                        onScrollEndDrag={handleScrollEndDrag}
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
                        disableIntervalMomentum={false}
                        bounces={true}
                        snapToInterval={width}
                        snapToAlignment="center"
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={3}
                        windowSize={5}
                        initialNumToRender={3}
                    />

                    {/* Bottom Bar with Thumbnails and Actions */}
                    <Animated.View entering={FadeIn.delay(300)} exiting={FadeOut} style={[styles.bottomBar, { paddingBottom: insets.bottom }, bottomBarAnimatedStyle, !controlsVisible && styles.hidden]}>
                        {/* Thumbnail Gallery - Hide when zoomed */}
                        {!isZoomed && (
                            <ScrollView
                                ref={thumbnailScrollRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.thumbnailContainer}
                                style={styles.thumbnailScroll}
                                decelerationRate="fast"
                                onScroll={handleThumbnailScroll}
                                onScrollEndDrag={handleThumbnailScrollEnd}
                                onMomentumScrollEnd={handleThumbnailScrollEnd}
                                scrollEventThrottle={1}
                                bounces={true}
                                snapToInterval={undefined}
                                pagingEnabled={false}
                            >
                                {imagesList.map((imageUri, index) => (
                                    <ThumbnailItem
                                        key={index}
                                        imageUri={imageUri}
                                        index={index}
                                        isActive={index === currentIndex}
                                        currentIndexShared={currentIndexShared}
                                        scrollProgress={scrollProgress}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            scrollProgress.value = 0;
                                            isProgrammaticScroll.current = true;
                                            setCurrentIndex(index);
                                            flatListRef.current?.scrollToIndex({ index, animated: true });
                                            // Reset flag after animation completes (longer timeout to prevent handleScroll interference)
                                            setTimeout(() => {
                                                isProgrammaticScroll.current = false;
                                            }, 500);
                                        }}
                                    />
                                ))}
                            </ScrollView>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionButtonsContainer}>
                            <Host style={{ width: "100%" }} matchContents={{ vertical: true }}>
                                <HStack alignment="center" spacing={20} modifiers={[padding({ horizontal: 20 })]}>
                                    {showShare && (
                                        <HStack
                                            alignment="center"
                                            modifiers={[
                                                padding({ all: 0 }),
                                                frame({ width: 48, height: 48 }),
                                                glassEffect({
                                                    glass: {
                                                        variant: "regular",
                                                    },
                                                }),
                                            ]}
                                        >
                                            <Button modifiers={[frame({ width: 48, height: 48 }), padding({ all: 0 })]} systemImage="square.and.arrow.up" variant="plain" controlSize="regular" onPress={handleSharePress} />
                                        </HStack>
                                    )}
                                    {(showBookmark || showEdit) && <Spacer />}
                                    {(showBookmark || showEdit) && (
                                        <HStack
                                            alignment="center"
                                            modifiers={[
                                                padding({ all: 0 }),
                                                frame({ width: showBookmark && showEdit ? 96 : 44, height: 44 }),
                                                glassEffect({
                                                    glass: {
                                                        variant: "regular",
                                                    },
                                                }),
                                            ]}
                                            spacing={4}
                                        >
                                            {showBookmark && (
                                                <Button
                                                    modifiers={[frame({ width: 44, height: 44 }), padding({ all: 0 })]}
                                                    systemImage={(localBookmarkMap.get(imagesList[currentIndex]) ?? imageUrlToBookmarkMapInternal.get(imagesList[currentIndex])) ? "heart.fill" : "heart"}
                                                    variant="plain"
                                                    controlSize="regular"
                                                    onPress={handleBookmarkPress}
                                                />
                                            )}
                                            {showEdit && <Button modifiers={[frame({ width: 44, height: 44 }), padding({ all: 0 })]} systemImage="slider.horizontal.3" variant="plain" controlSize="regular" onPress={handleAdjustPress} />}
                                        </HStack>
                                    )}
                                    {showArchive && <Spacer />}
                                    {showArchive && (
                                        <HStack
                                            alignment="center"
                                            modifiers={[
                                                padding({ all: 0 }),
                                                frame({ width: 48, height: 48 }),
                                                glassEffect({
                                                    glass: {
                                                        variant: "regular",
                                                    },
                                                }),
                                            ]}
                                        >
                                            <Button modifiers={[frame({ width: 48, height: 48 }), padding({ all: 0 })]} systemImage="archivebox" variant="plain" role="destructive" controlSize="large" onPress={handleArchivePress} />
                                        </HStack>
                                    )}
                                </HStack>
                            </Host>
                        </View>
                    </Animated.View>
                </View>
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
        paddingHorizontal: width / 2 - 20,
        gap: 4,
    },
    thumbnail: {
        height: 40,
        borderRadius: 6,
        overflow: "hidden",
        borderWidth: 0,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
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
