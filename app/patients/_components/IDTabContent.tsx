import { BaseText, ErrorState } from "@/components";
import { ImageViewerModal } from "@/components/Image/ImageViewerModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import type { Practice } from "@/utils/service/models/ResponseModels";
import { PatientDocument } from "@/utils/service/models/ResponseModels";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Skeleton Loading Component
const SkeletonCard: React.FC<{ index: number }> = ({ index }) => {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        opacity.value = withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })), -1, false);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.skeletonCard, animatedStyle, { opacity: 1 }]}>
            {/* Image Skeleton */}
            <View style={styles.skeletonImageContainer}>
                <Animated.View style={[styles.skeletonImage, animatedStyle]} />
            </View>
            {/* Footer Skeleton */}
            <View style={styles.skeletonFooter}>
                <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
                <Animated.View style={[styles.skeletonDate, animatedStyle]} />
            </View>
        </Animated.View>
    );
};

const IDTabSkeleton: React.FC = () => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.listContent, { paddingBottom: insets.bottom }]}>
            {[0, 1].map((index) => (
                <SkeletonCard key={index} index={index} />
            ))}
        </View>
    );
};

const { width: screenWidth } = Dimensions.get("window");

function getDocumentImageUrl(doc: PatientDocument): string | null {
    if (typeof doc.image === "string") return doc.image;
    return doc.image?.url ?? null;
}

interface IDTabContentProps {
    documents: PatientDocument[];
    isLoading: boolean;
    error?: Error | null;
    isError?: boolean;
    onRetry?: () => void;
    onDocumentPress?: (document: PatientDocument) => void;
    /** Patient ID for ImageViewerModal (shows patient name in header) */
    patientId?: string | number;
    /** Optional: for Share composition (header + image + footer) */
    practice?: Practice;
    metadata?: { address?: string; phone?: string; email?: string; website?: string; print_settings?: any } | null;
}

export const IDTabContent: React.FC<IDTabContentProps> = React.memo(({ documents, isLoading, error, isError, onRetry, onDocumentPress, patientId, practice, metadata }) => {
    const insets = useSafeAreaInsets();
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

    const imageUrls = useMemo(() => documents.map(getDocumentImageUrl).filter((url): url is string => !!url), [documents]);

    const imageUrlToCreatedAtMap = useMemo(() => {
        const map = new Map<string, string>();
        documents.forEach((doc) => {
            const url = getDocumentImageUrl(doc);
            if (url && doc.created_at) map.set(url, doc.created_at);
        });
        return map;
    }, [documents]);

    const handleDocumentPress = useCallback(
        (item: PatientDocument, index: number) => {
            const url = getDocumentImageUrl(item);
            if (url && imageUrls.length > 0) {
                const idx = imageUrls.indexOf(url);
                setViewerInitialIndex(idx >= 0 ? idx : 0);
                setViewerVisible(true);
            }
            onDocumentPress?.(item);
        },
        [imageUrls, onDocumentPress],
    );

    const renderDocumentItem = useCallback(
        ({ item, index }: { item: PatientDocument; index: number }) => {
            // Handle both string URL and Media object
            const imageUrl = typeof item.image === "string" ? item.image : item.image?.url;

            return (
                <TouchableOpacity style={styles.documentCard} onPress={() => handleDocumentPress(item, index)} activeOpacity={0.8}>
                    <View style={styles.cardContent}>
                        {/* Left side - Image */}
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="contain" />
                        ) : (
                            <View style={styles.cardImagePlaceholder}>
                                <IconSymbol name="person.text.rectangle" color={colors.labels.tertiary} size={48} />
                            </View>
                        )}
                    </View>

                    {/* Footer - Type and Date */}
                    <View style={styles.cardFooter}>
                        <BaseText type="Subhead" weight="600" color="labels.primary" style={styles.cardType}>
                            {item.type || "ID Document"}
                        </BaseText>
                        <BaseText type="Caption1" weight="400" color="labels.secondary" style={styles.cardDate}>
                            {getRelativeTime(item.created_at)}
                        </BaseText>
                    </View>
                </TouchableOpacity>
            );
        },
        [handleDocumentPress],
    );

    if (isLoading) {
        return <IDTabSkeleton />;
    }

    if (isError) {
        return <ErrorState message={(error as any)?.message || "Failed to load documents"} onRetry={onRetry} title="Failed to load documents" />;
    }

    if (!documents || documents.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <IconSymbol name="person.text.rectangle" color={colors.labels.tertiary} size={64} />
                <BaseText type="Title2" weight="600" color="labels.secondary" style={styles.emptyTitle}>
                    No ID Documents
                </BaseText>
                <BaseText type="Body" color="labels.tertiary" style={styles.emptyDescription}>
                    Tap "Add ID" to scan and upload a document
                </BaseText>
            </View>
        );
    }

    const paddingBottom = insets.bottom;

    return (
        <>
            <FlatList data={documents} renderItem={renderDocumentItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} numColumns={1} ListFooterComponent={<View style={{ height: paddingBottom }} />} />
            <ImageViewerModal
                visible={viewerVisible}
                images={imageUrls}
                initialIndex={viewerInitialIndex}
                onClose={() => setViewerVisible(false)}
                patientId={patientId}
                imageUrlToCreatedAtMap={imageUrlToCreatedAtMap}
                description="Date"
                actions={{ showBookmark: false, showEdit: false, showArchive: false, showShare: true }}
                practice={practice}
                metadata={metadata}
            />
        </>
    );
});

const styles = StyleSheet.create({
    // Skeleton Styles
    skeletonCard: {
        overflow: "hidden",
        marginBottom: spacing["2"],
    },
    skeletonImageContainer: {
        padding: spacing["4"],
        minHeight: 290,
    },
    skeletonImage: {
        width: "100%",
        height: "100%",
        backgroundColor: colors.system.gray5,
        borderRadius: 20,
    },
    skeletonFooter: {
        paddingHorizontal: spacing["5"],
        gap: 8,
    },
    skeletonTitle: {
        height: 20,
        width: "40%",
        backgroundColor: colors.system.gray5,
        borderRadius: 6,
    },
    skeletonDate: {
        height: 16,
        width: "25%",
        backgroundColor: colors.system.gray5,
        borderRadius: 6,
    },
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
    listContent: {
        paddingHorizontal: spacing["4"], // 16px
        paddingTop: spacing["4"], // 16px
        gap: spacing["2"], // 8px gap between cards
    },
    documentCard: {
        overflow: "hidden",
    },
    cardContent: {
        flexDirection: "row",
        padding: spacing["4"], // 16px
        gap: spacing["0"], // 16px
        minHeight: 290,
        borderRadius: 20,
    },

    cardImage: {
        width: "100%",
        backgroundColor: colors.system.gray5,
        height: "100%",
        borderRadius: 20,
    },
    cardImagePlaceholder: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.system.gray5,
    },
    cardInfoContainer: {
        flex: 1,
        justifyContent: "center",
        gap: spacing["2"], // 8px
        paddingLeft: spacing["2"], // 8px
    },
    infoLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.system.gray5,
        width: "100%",
    },
    infoLineShort: {
        width: "60%",
    },
    cardFooter: {
        paddingHorizontal: spacing["5"], // 16px
    },
    cardType: {
        fontSize: 15,
        lineHeight: 20,
        letterSpacing: -0.24,
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 13,
        lineHeight: 18,
        letterSpacing: -0.08,
    },
});
