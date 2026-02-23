import { BaseText } from "@/components";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import type { Practice } from "@/utils/service/models/ResponseModels";
import { ButtonRole } from "@expo/ui/swift-ui";
import { Image } from "expo-image";
import { SymbolViewProps } from "expo-symbols";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ImageViewerModal } from "./ImageViewerModal";

type GalleryImageItemProps = {
    uri: string;
    index: number;
    itemWidth: number;
    gap: number;
    numColumns: number;
    menuItems: Array<{ icon: SymbolViewProps["name"]; label: string; onPress?: (uri: string) => void; role?: ButtonRole }>;
    onImagePress: (uri: string) => void;
    imageUrlToBookmarkMap?: Map<string, boolean>;
    imageUrlToIsAfterMap?: Map<string, boolean>;
    imageUrlToHasAfterMap?: Map<string, boolean>;
    showBookmarkBadge?: boolean;
    showCompareBadgeOnThumbnails?: boolean;
    isLoading: boolean;
    onLoadState: (uri: string, state: "start" | "load" | "error") => void;
};

const GalleryImageItem: React.FC<GalleryImageItemProps> = React.memo(({ uri, index, itemWidth, gap, numColumns, menuItems, onImagePress, imageUrlToBookmarkMap, imageUrlToIsAfterMap, imageUrlToHasAfterMap, showBookmarkBadge = true, showCompareBadgeOnThumbnails = true, isLoading, onLoadState }) => {
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

    const handleImageLoadStart = useCallback(() => {
        imageOpacityShared.value = 0;
        skeletonOpacityShared.value = 1;
        onLoadState(uri, "start");
    }, [uri, onLoadState]);

    const handleImageLoad = useCallback(() => {
        skeletonOpacityShared.value = withTiming(0, { duration: 300 });
        imageOpacityShared.value = withTiming(1, { duration: 300 });
        onLoadState(uri, "load");
    }, [uri, onLoadState]);

    const handleImageError = useCallback(() => {
        skeletonOpacityShared.value = withTiming(0, { duration: 300 });
        imageOpacityShared.value = withTiming(1, { duration: 300 });
        onLoadState(uri, "error");
    }, [uri, onLoadState]);

    return (
        <View style={{ width: itemWidth, height: itemWidth }}>
            {/* <Host style={{ width: itemWidth, height: itemWidth }}>
                <ContextMenu activationMethod="longPress">
                    <ContextMenu.Items>
                        {menuItems.map((menu, menuIndex) => (
                            <Button key={`${menu.icon}-${menuIndex}`} systemImage={menu.icon} role={menu.role} onPress={() => menu.onPress?.(uri)}>
                                {menu.label}
                            </Button>
                        ))}
                    </ContextMenu.Items>

                    <ContextMenu.Trigger>
                        <View style={{ width: itemWidth, height: itemWidth }}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => onImagePress(uri)}
                                style={{
                                    width: itemWidth,
                                    height: itemWidth,
                                    marginRight: index < numColumns - 1 ? gap : 0,
                                    overflow: "hidden",
                                }}
                            >
                                <Animated.View style={[styles.skeletonContainer, skeletonAnimatedStyle]}>
                                    <ImageSkeleton width={itemWidth} height={itemWidth} borderRadius={0} variant="rectangular" />
                                </Animated.View>
                                <Animated.View style={[styles.imageContainer, imageOpacityAnimatedStyle]}>
                                    <Image
                                        source={{ uri }}
                                        style={{
                                            width: itemWidth,
                                            height: itemWidth,
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
                    </ContextMenu.Trigger>
                </ContextMenu>
            </Host> */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress(uri)}
                style={{
                    width: itemWidth,
                    height: itemWidth,
                    overflow: "hidden",
                }}
            >
                <Animated.View style={[styles.skeletonContainer, skeletonAnimatedStyle]}>
                    <ImageSkeleton width={itemWidth} height={itemWidth} borderRadius={0} variant="rectangular" />
                </Animated.View>
                <Animated.View style={[styles.imageContainer, imageOpacityAnimatedStyle]}>
                    <Image
                        source={{ uri }}
                        style={{
                            width: itemWidth,
                            height: itemWidth,
                        }}
                        contentFit="cover"
                        onLoadStart={handleImageLoadStart}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                </Animated.View>
                {showBookmarkBadge && imageUrlToBookmarkMap?.get(uri) && (
                    <View style={styles.bookmarkIcon}>
                        <IconSymbol name="heart.fill" size={16} color={colors.system.white as any} />
                    </View>
                )}
                {/* Before/After Badge – در البوم با showCompareBadgeOnThumbnails=false مخفی می‌شود */}
                {showCompareBadgeOnThumbnails && (imageUrlToIsAfterMap?.get(uri) || imageUrlToHasAfterMap?.get(uri)) && (
                    <View style={styles.badgeContainer}>
                        <IconSymbol name={imageUrlToIsAfterMap?.get(uri) ? "rectangle.lefthalf.filled" : "rectangle.righthalf.filled"} size={14} color={colors.system.gray as any} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
});

GalleryImageItem.displayName = "GalleryImageItem";

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
    id: string;
    items: string[];
    sectionKey: string;
}

export interface ViewerActionsConfig {
    showBookmark?: boolean;
    showEdit?: boolean;
    showArchive?: boolean;
    showShare?: boolean;
    showRestore?: boolean;
    showMagic?: boolean;
    showNote?: boolean;
    /** Show Compare (before/after split) only on patient detail route; hide in album */
    showCompare?: boolean;
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
    is_after?: boolean;
    has_after?: boolean;
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
    /** Only show "Take after Template" in viewer when true (e.g. only on patient gallery page) */
    enableTakeAfterTemplate?: boolean;
    /** Callback when note icon is pressed in viewer (optional; showNote in actions must be true) */
    onNotePress?: (imageUri: string) => void;
    /** در البوم false بگذار تا آیکون before/after روی thumbnailها نشان داده نشود */
    showCompareBadgeOnThumbnails?: boolean;
    /** بعد از Save ادیت: فقط همین یورای یک‌بار رفرش شود */
    imageRefreshKey?: number;
    imageSavedUri?: string | null;
}

const { width } = Dimensions.get("window");

const GALLERY_GAP = 2;

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
    enableTakeAfterTemplate = false,
    onNotePress,
    showCompareBadgeOnThumbnails = true,
    imageRefreshKey,
    imageSavedUri,
}) => {
    const { showBookmark = true, showEdit = true, showArchive = true, showShare = true, showMagic = false, showNote = false, showCompare = false } = actions;
    const [numColumns, setNumColumns] = useState(initialColumns);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [viewerImagesList, setViewerImagesList] = useState<string[]>([]);
    const [selectedUriWhenOpened, setSelectedUriWhenOpened] = useState<string | null>(null);
    const [imageLoadingStates, setImageLoadingStates] = useState<Map<string, boolean>>(new Map());

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

    // Transform sections data into rows for multi-column layout (each row has stable id for list recycling)
    const sectionsWithRows = useMemo(() => {
        return imageSections.map((section, sectionIndex) => {
            const sectionKey = section.title ? section.title : `section-${sectionIndex}`;
            const rows: ImageRow[] = [];
            for (let i = 0; i < section.data.length; i += numColumns) {
                const items = section.data.slice(i, i + numColumns);
                const rowId = `${sectionKey}-row-${i}-${items[0] ?? i}`;
                rows.push({
                    id: rowId,
                    items,
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
        const gap = GALLERY_GAP;
        const totalGap = (numColumns - 1) * gap;
        const itemWidth = (width - totalGap) / numColumns;
        return { gap, itemWidth };
    }, [numColumns, width]);

    // Map composite URL -> list of display URLs (edited_image ?? image per cell, edited_media ?? original_media for composite)
    const originalMediaToAllImagesMap = useMemo(() => {
        const map = new Map<string, string[]>();
        if (!rawMediaData || !Array.isArray(rawMediaData)) return map;

        rawMediaData.forEach((media: RawMediaData) => {
            if (!media.template || !media.original_media?.url) return;
            const editedComposite = (media as { edited_media?: { url?: string } }).edited_media?.url;
            const displayComposite = editedComposite ?? media.original_media.url;
            const allImages: string[] = [displayComposite];

            if (media.images && Array.isArray(media.images)) {
                media.images.forEach((img: any) => {
                    const displayUrl = img.edited_image?.url ?? img.image?.url;
                    if (displayUrl) allImages.push(displayUrl);
                });
            }

            map.set(media.original_media.url, allImages);
            if (editedComposite) map.set(editedComposite, allImages);
        });

        return map;
    }, [rawMediaData]);

    // Create maps for is_after and has_after badges
    const { imageUrlToIsAfterMap, imageUrlToHasAfterMap } = useMemo(() => {
        const isAfterMap = new Map<string, boolean>();
        const hasAfterMap = new Map<string, boolean>();

        if (rawMediaData && Array.isArray(rawMediaData)) {
            rawMediaData.forEach((media: RawMediaData) => {
                const isAfter = media.is_after === true;
                const hasAfter = media.has_after === true;

                const editedComposite = (media as { edited_media?: { url?: string } }).edited_media?.url;
                if (media.original_media?.url) {
                    if (isAfter) {
                        isAfterMap.set(media.original_media.url, true);
                        if (editedComposite) isAfterMap.set(editedComposite, true);
                    }
                    if (hasAfter) {
                        hasAfterMap.set(media.original_media.url, true);
                        if (editedComposite) hasAfterMap.set(editedComposite, true);
                    }
                }
                if (media.images && Array.isArray(media.images)) {
                    media.images.forEach((img: any) => {
                        const url = img.edited_image?.url ?? img.image?.url;
                        if (url) {
                            if (isAfter) isAfterMap.set(url, true);
                            if (hasAfter) hasAfterMap.set(url, true);
                        }
                    });
                }
            });
        }

        return {
            imageUrlToIsAfterMap: isAfterMap,
            imageUrlToHasAfterMap: hasAfterMap,
        };
    }, [rawMediaData]);

    const allImages = useMemo(() => {
        return imageSections.flatMap((section) => section.data);
    }, [imageSections]);

    // لیست گسترش‌یافته: هر کامپوزیت به [کامپوزیت + سلول‌ها] باز می‌شود تا با تپ روی هر عکس (کامپوزیت یا نه) کاربر با سوایپ همه را ببیند
    const allImagesExpanded = useMemo(() => {
        return allImages.flatMap((uri) => originalMediaToAllImagesMap.get(uri) ?? [uri]);
    }, [allImages, originalMediaToAllImagesMap]);

    const handleImagePress = useCallback(
        (uri: string) => {
            if (onImagePress) onImagePress(uri);

            const compositeList = originalMediaToAllImagesMap?.get(uri);
            const imagesToShow = compositeList ?? allImagesExpanded;
            const index = imagesToShow.indexOf(uri);
            if (index !== -1) {
                setSelectedUriWhenOpened(uri);
                setViewerImagesList(imagesToShow);
                setSelectedIndex(index);
                setViewerVisible(true);
            }
        },
        [onImagePress, originalMediaToAllImagesMap, allImagesExpanded],
    );

    useEffect(() => {
        if (!viewerVisible || !selectedUriWhenOpened) return;
        const compositeList = originalMediaToAllImagesMap?.get(selectedUriWhenOpened);
        const newList = compositeList ?? allImagesExpanded;
        setViewerImagesList(newList);
        const idx = newList.indexOf(selectedUriWhenOpened);
        if (idx >= 0) setSelectedIndex(idx);
    }, [viewerVisible, selectedUriWhenOpened, allImagesExpanded, originalMediaToAllImagesMap]);

    const handleImageLoadState = useCallback((uri: string, state: "start" | "load" | "error") => {
        setImageLoadingStates((prev) => {
            const next = new Map(prev);
            next.set(uri, state === "start");
            return next;
        });
    }, []);

    const viewerImages = useMemo(() => {
        if (viewerImagesList.length > 0) return viewerImagesList;
        return allImagesExpanded;
    }, [viewerImagesList, allImagesExpanded]);

    const renderImageItem = useCallback(
        (uri: string, index: number) => {
            const isLoading = imageLoadingStates.get(uri) ?? true;
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
                    imageUrlToIsAfterMap={imageUrlToIsAfterMap}
                    imageUrlToHasAfterMap={imageUrlToHasAfterMap}
                    showBookmarkBadge={showBookmark}
                    showCompareBadgeOnThumbnails={showCompareBadgeOnThumbnails}
                    isLoading={isLoading}
                    onLoadState={handleImageLoadState}
                />
            );
        },
        [imageLoadingStates, layoutValues, numColumns, menuItems, handleImagePress, imageUrlToBookmarkMap, imageUrlToIsAfterMap, imageUrlToHasAfterMap, showBookmark, showCompareBadgeOnThumbnails, handleImageLoadState],
    );

    const renderItem = useCallback(
        ({ item }: { item: ImageRow; index: number }) => (
            <View style={styles.rowContainer}>
                {item.items.map((uri, itemIndex) => (
                    <React.Fragment key={uri}>{renderImageItem(uri, itemIndex)}</React.Fragment>
                ))}
            </View>
        ),
        [renderImageItem],
    );

    const renderSectionHeader = useCallback(({ section }: { section: { title: string; data: ImageRow[] } }) => {
        if (!section.title) return null;
        return (
            <View style={styles.sectionHeader}>
                <BaseText type="Footnote" weight="500" color="labels.secondary" style={styles.sectionHeaderText}>
                    {section.title}
                </BaseText>
            </View>
        );
    }, []);

    const viewerOnClose = useCallback(() => {
        setViewerVisible(false);
        setViewerImagesList([]);
        setSelectedUriWhenOpened(null);
    }, []);

    const viewerActions = useMemo(
        () => ({
            showBookmark,
            showEdit,
            showArchive,
            showShare,
            showRestore: !!onRestore,
            showMagic,
            showNote,
            showCompare,
        }),
        [showBookmark, showEdit, showArchive, showShare, onRestore, showMagic, showNote, showCompare],
    );

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
        <View style={{ flex: 1, backgroundColor: colors.system.gray6 }}>
            <SectionList
                sections={sectionsWithRows}
                key={numColumns}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item) => item.id}
                stickySectionHeadersEnabled={false}
                removeClippedSubviews={false}
                contentContainerStyle={styles.sectionListContent}
                initialNumToRender={8}
                maxToRenderPerBatch={6}
                windowSize={7}
            />

            <ImageViewerModal
                visible={viewerVisible}
                images={viewerImages}
                initialIndex={selectedIndex}
                onClose={viewerOnClose}
                mediaData={mediaData}
                imageUrlToMediaIdMap={imageUrlToMediaIdMap}
                imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                imageUrlToCreatedAtMap={imageUrlToCreatedAtMap}
                patientId={patientId}
                rawMediaData={rawMediaData}
                description={description}
                actions={viewerActions}
                onRestore={onRestore}
                onNotePress={onNotePress}
                practice={practice}
                metadata={metadata}
                enableTakeAfterTemplate={enableTakeAfterTemplate}
                imageRefreshKey={imageRefreshKey}
                imageSavedUri={imageSavedUri}
            />
        </View>
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
        backgroundColor: "red",
    },
    rowContainer: {
        flexDirection: "row",
        gap: GALLERY_GAP,
        marginBottom: GALLERY_GAP,
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
    badgeContainer: {
        position: "absolute",
        top: 8,
        right: 8,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        width: 27,
        height: 27,
        borderRadius: 99,
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
    imageContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
