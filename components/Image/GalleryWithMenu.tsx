import { BaseText } from "@/components";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import type { Practice } from "@/utils/service/models/ResponseModels";
import { ButtonRole } from "@expo/ui/swift-ui";
import { Image } from "expo-image";
import { SymbolViewProps } from "expo-symbols";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ImageViewerModal } from "./ImageViewerModal";

// Separate component for image item to properly use hooks
const GalleryImageItem: React.FC<{
    uri: string;
    index: number;
    itemWidth: number;
    gap: number;
    numColumns: number;
    menuItems: Array<{ icon: SymbolViewProps["name"]; label: string; onPress?: (uri: string) => void; role?: ButtonRole }>;
    onImagePress: (uri: string) => void;
    imageUrlToBookmarkMap?: Map<string, boolean>;
    isLoading: boolean;
    onLoadStart: () => void;
    onLoad: () => void;
    onError: () => void;
}> = ({ uri, index, itemWidth, gap, numColumns, menuItems, onImagePress, imageUrlToBookmarkMap, isLoading, onLoadStart, onLoad, onError }) => {
    // Use local shared values for opacity animation per image
    const imageOpacityShared = useSharedValue(isLoading ? 0 : 1);
    const skeletonOpacityShared = useSharedValue(isLoading ? 1 : 0);

    // Sync animation state when cell is recycled with new uri/isLoading
    useEffect(() => {
        if (isLoading) {
            skeletonOpacityShared.value = 1;
            imageOpacityShared.value = 0;
        } else {
            skeletonOpacityShared.value = 0;
            imageOpacityShared.value = 1;
        }
    }, [uri, isLoading, skeletonOpacityShared, imageOpacityShared]);

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacityShared.value,
    }));

    const imageOpacityAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacityShared.value,
    }));

    const handleImageLoadStart = () => {
        imageOpacityShared.value = 0;
        skeletonOpacityShared.value = 1;
        onLoadStart();
    };

    const handleImageLoad = () => {
        skeletonOpacityShared.value = withTiming(0, { duration: 300 });
        imageOpacityShared.value = withTiming(1, { duration: 300 });
        onLoad();
    };

    const handleImageError = () => {
        skeletonOpacityShared.value = withTiming(0, { duration: 300 });
        imageOpacityShared.value = withTiming(1, { duration: 300 });
        onError();
    };

    return (
        <View style={{ width: itemWidth, height: itemWidth }}>
            {/* <Host matchContents modifiers={[frame({ width: itemWidth, height: itemWidth })]}>
                <ContextMenu modifiers={[frame({ width: itemWidth, height: itemWidth })]} activationMethod="longPress">
                    <ContextMenu.Items>
                        {menuItems.map((menu, menuIndex) => (
                            <Button key={`${menu.icon}-${menuIndex}`} systemImage={menu.icon} role={menu.role} onPress={() => menu.onPress?.(uri)}>
                                {menu.label}
                            </Button>
                        ))}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => onImagePress(uri)}
                            style={{
                                width: itemWidth,
                                height: itemWidth,
                                marginRight: index < numColumns - 1 ? gap : 0,
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            <Animated.View style={[styles.skeletonContainer, skeletonAnimatedStyle]}>
                                <ImageSkeleton width={itemWidth} height={itemWidth} borderRadius={0} variant="rectangular" />
                            </Animated.View>
                            <Animated.View style={imageOpacityAnimatedStyle}>
                                <Image
                                    source={{ uri }}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                    contentFit="cover"
                                    onLoadStart={handleImageLoadStart}
                                    onLoad={handleImageLoad}
                                    onError={handleImageError}
                                />
                            </Animated.View>
                            {imageUrlToBookmarkMap?.get(uri) && (
                                <View style={styles.bookmarkIcon}>
                                    <IconSymbol name="heart.fill" size={16} color={colors.system.white as any} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host> */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress(uri)}
                style={{
                    width: itemWidth,
                    height: itemWidth,
                    marginRight: index < numColumns - 1 ? gap : 0,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <Animated.View style={[styles.skeletonContainer, skeletonAnimatedStyle]}>
                    <ImageSkeleton width={itemWidth} height={itemWidth} borderRadius={0} variant="rectangular" />
                </Animated.View>
                <Animated.View style={imageOpacityAnimatedStyle}>
                    <Image
                        source={{ uri }}
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                        contentFit="cover"
                        onLoadStart={handleImageLoadStart}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                </Animated.View>
                {imageUrlToBookmarkMap?.get(uri) && (
                    <View style={styles.bookmarkIcon}>
                        <IconSymbol name="heart.fill" size={16} color={colors.system.white as any} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

interface MenuItem {
    icon: SymbolViewProps["name"];
    label: string;
    onPress?: (uri: string) => void;
    role?: ButtonRole;
}

interface ImageSection {
    title: string;
    data: string[];
}

interface ImageRow {
    items: string[];
    sectionKey: string;
}

export interface ViewerActionsConfig {
    showBookmark?: boolean;
    showEdit?: boolean;
    showArchive?: boolean;
    showShare?: boolean;
    showRestore?: boolean;
}

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
    [key: string]: any;
}

interface GalleryWithMenuProps {
    images?: string[]; // For backward compatibility
    sections?: ImageSection[]; // New grouped format
    initialColumns?: number;
    minColumns?: number;
    maxColumns?: number;
    onImagePress?: (uri: string) => void;
    menuItems: MenuItem[];
    // New prop: pass raw media data and component will build maps internally
    mediaData?: MediaItem[];
    // Legacy props (for backward compatibility)
    imageUrlToMediaIdMap?: Map<string, number | string>;
    imageUrlToBookmarkMap?: Map<string, boolean>;
    imageUrlToCreatedAtMap?: Map<string, string>;
    patientId?: string | number;
    actions?: ViewerActionsConfig;
    // Raw media data from API (with template and images structure) - used to build originalMediaToAllImagesMap internally
    rawMediaData?: RawMediaData[];
    // Display description option for ImageViewerModal: "Date" to show when photo was taken, "taker" to show who took it
    description?: "Date" | "taker";
    // Callback for restore action (for archived media)
    onRestore?: (imageUri: string) => void;
    // Optional: for Share composition (header + image + footer)
    practice?: Practice;
    metadata?: { address?: string; phone?: string; email?: string; website?: string; print_settings?: any } | null;
}

const { width } = Dimensions.get("window");

export const GalleryWithMenu: React.FC<GalleryWithMenuProps> = ({
    images,
    sections,
    initialColumns = 2,
    minColumns = 2,
    maxColumns = 6,
    onImagePress,
    menuItems,
    mediaData,
    imageUrlToMediaIdMap,
    imageUrlToBookmarkMap,
    imageUrlToCreatedAtMap,
    patientId,
    actions = { showBookmark: true, showEdit: true, showArchive: true, showShare: true },
    rawMediaData,
    description = "taker",
    onRestore,
    practice,
    metadata,
}) => {
    const { showBookmark = true, showEdit = true, showArchive = true, showShare = true } = actions;
    const [numColumns, setNumColumns] = useState(initialColumns);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [viewerImagesList, setViewerImagesList] = useState<string[]>([]);
    const scale = useSharedValue(1);
    // Track loading state for each image in gallery
    const [imageLoadingStates, setImageLoadingStates] = useState<Map<string, boolean>>(new Map());
    // Animated opacity values for smooth transitions - use a single shared value approach
    // Instead of per-image shared values, we'll use animated styles with conditional rendering
    const defaultImageOpacity = useSharedValue(0);
    const defaultSkeletonOpacity = useSharedValue(1);

    // Fetch patient data if patientId is provided (for ImageViewerModal)
    // Note: ImageViewerModal will fetch patient data itself using patientId

    // Convert images array to sections format if sections not provided (backward compatibility)
    const imageSections = useMemo(() => {
        if (sections && sections.length > 0) {
            return sections;
        }
        if (images && images.length > 0) {
            return [{ title: "", data: images }];
        }
        return [];
    }, [images, sections]);

    // Transform sections data into rows for multi-column layout
    const sectionsWithRows = useMemo(() => {
        return imageSections.map((section, sectionIndex) => {
            const sectionKey = section.title ? section.title : `section-${sectionIndex}`;
            const rows: ImageRow[] = [];
            for (let i = 0; i < section.data.length; i += numColumns) {
                rows.push({
                    items: section.data.slice(i, i + numColumns),
                    sectionKey,
                });
            }
            return {
                title: section.title,
                data: rows,
            };
        });
    }, [imageSections, numColumns]);

    const layoutValues = useMemo(() => {
        const gap = 1;
        const totalGap = (numColumns - 1) * gap;
        const itemWidth = (width - totalGap) / numColumns;
        return { gap, itemWidth };
    }, [numColumns, width]);

    // Create a map from original_media URL to all images (original_media + template images) for viewer
    const originalMediaToAllImagesMap = useMemo(() => {
        const map = new Map<string, string[]>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            // Only process media with template
            if (media.template && media.original_media?.url) {
                const allImages: string[] = [media.original_media.url]; // Start with original_media

                // Add all template images
                if (media.images && Array.isArray(media.images)) {
                    media.images.forEach((img: any) => {
                        if (img.image?.url) {
                            allImages.push(img.image.url);
                        }
                    });
                }

                map.set(media.original_media.url, allImages);
            }
        });

        return map;
    }, [rawMediaData]);

    // Flatten all images for the viewer modal (gallery view - only original_media for template media)
    const allImages = useMemo(() => {
        return imageSections.flatMap((section) => section.data);
    }, [imageSections]);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = e.scale;
        })
        .onEnd(() => {
            const s = scale.value;
            runOnJS(() => {
                if (s > 1.2 && numColumns > minColumns) {
                    setNumColumns(numColumns - 1);
                } else if (s < 0.8 && numColumns < maxColumns) {
                    setNumColumns(numColumns + 1);
                }
            })();
            scale.value = 1;
        });

    const handleImagePress = (uri: string) => {
        if (onImagePress) onImagePress(uri);

        // Check if this is original_media of a template - if so, use expanded images
        const expandedImages = originalMediaToAllImagesMap?.get(uri);
        const imagesToShow = expandedImages || allImages;

        // Find the index of the clicked image in the imagesToShow array
        const index = imagesToShow.indexOf(uri);
        if (index !== -1) {
            // Set the images list for viewer and the selected index
            setViewerImagesList(imagesToShow);
            setSelectedIndex(index);
            setViewerVisible(true);
        }
    };

    // Get images to show in viewer (use viewerImagesList if set, otherwise allImages)
    const viewerImages = useMemo(() => {
        if (viewerImagesList.length > 0) {
            return viewerImagesList;
        }
        return allImages;
    }, [viewerImagesList, allImages]);

    const renderImageItem = (uri: string, index: number) => {
        const isLoading = imageLoadingStates.get(uri) ?? true; // Default to loading

        const handleImageLoadStart = () => {
            setImageLoadingStates((prev) => {
                const newMap = new Map(prev);
                newMap.set(uri, true);
                return newMap;
            });
        };

        const handleImageLoad = () => {
            setImageLoadingStates((prev) => {
                const newMap = new Map(prev);
                newMap.set(uri, false);
                return newMap;
            });
        };

        const handleImageError = () => {
            setImageLoadingStates((prev) => {
                const newMap = new Map(prev);
                newMap.set(uri, false);
                return newMap;
            });
        };

        return (
            <GalleryImageItem
                uri={uri}
                index={index}
                itemWidth={layoutValues.itemWidth}
                gap={layoutValues.gap}
                numColumns={numColumns}
                menuItems={menuItems}
                onImagePress={handleImagePress}
                imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                isLoading={isLoading}
                onLoadStart={handleImageLoadStart}
                onLoad={handleImageLoad}
                onError={handleImageError}
            />
        );
    };

    const renderItem = ({ item, index }: { item: ImageRow; index: number }) => {
        return (
            <View style={styles.rowContainer}>
                {item.items.map((uri, itemIndex) => (
                    <React.Fragment key={`${item.sectionKey}-row-${index}-item-${itemIndex}-${uri}`}>{renderImageItem(uri, itemIndex)}</React.Fragment>
                ))}
            </View>
        );
    };

    const renderSectionHeader = ({ section }: { section: { title: string; data: ImageRow[] } }) => {
        if (!section.title) return null;
        return (
            <View style={styles.sectionHeader}>
                <BaseText type="Footnote" weight="500" color="labels.secondary" style={styles.sectionHeaderText}>
                    {section.title}
                </BaseText>
            </View>
        );
    };

    // Show empty state if no images
    if (!imageSections || imageSections.length === 0 || allImages.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <IconSymbol name="photo" color={colors.labels.tertiary} size={64} />
                <BaseText type="Title2" weight="600" color="labels.secondary" style={styles.emptyTitle}>
                    No Images
                </BaseText>
                <BaseText type="Body" color="labels.tertiary" style={styles.emptyDescription}>
                    This patient doesn't have any images yet.
                </BaseText>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GestureDetector gesture={pinchGesture}>
                <Animated.View style={{ flex: 1 }}>
                    <SectionList sections={sectionsWithRows} key={numColumns} renderItem={renderItem} renderSectionHeader={renderSectionHeader} keyExtractor={(item, index) => `${item.sectionKey}-row-${index}`} stickySectionHeadersEnabled={false} removeClippedSubviews={false} contentContainerStyle={styles.sectionListContent} />
                </Animated.View>
            </GestureDetector>

            <ImageViewerModal
                visible={viewerVisible}
                images={viewerImages}
                initialIndex={selectedIndex}
                onClose={() => {
                    setViewerVisible(false);
                    setViewerImagesList([]); // Reset viewer images list when closing
                }}
                mediaData={mediaData}
                imageUrlToMediaIdMap={imageUrlToMediaIdMap}
                imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                imageUrlToCreatedAtMap={imageUrlToCreatedAtMap}
                patientId={patientId}
                rawMediaData={rawMediaData}
                description={description}
                actions={{
                    showBookmark,
                    showEdit,
                    showArchive,
                    showShare,
                    showRestore: !!onRestore,
                }}
                onRestore={onRestore}
                practice={practice}
                metadata={metadata}
            />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        textAlign: "center",
    },
    sectionHeader: {
        backgroundColor: colors.system.white,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionHeaderText: {
        fontSize: 15,
        letterSpacing: -0.24,
    },
    sectionListContent: {
        paddingBottom: 16,
    },
    rowContainer: {
        flexDirection: "row",
        marginBottom: 0.5,
    },
    bookmarkIcon: {
        position: "absolute",
        bottom: 8,
        left: 8,
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    skeletonContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
});
