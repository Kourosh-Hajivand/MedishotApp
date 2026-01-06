import { BaseText } from "@/components";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import { useGetPatientsArchived } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Alert, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PatientArchiveScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const { selectedPractice } = useProfileStore();

    const { data: archivedData, isLoading } = useGetPatientsArchived(selectedPractice?.id || 0, id || "", !!selectedPractice?.id && !!id);

    // Extract image URLs and create sections grouped by date
    const gallerySections = useMemo(() => {
        if (!archivedData?.data || !Array.isArray(archivedData.data)) {
            return [];
        }

        // Map to store images grouped by date
        const imagesByDate = new Map<string, string[]>();

        archivedData.data.forEach((media: any) => {
            const createdAt = media.created_at || media.updated_at;
            if (!createdAt) return;

            // Format date as "MMMM D, YYYY" (e.g., "January 2, 2026")
            const date = new Date(createdAt);
            const dateKey = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

            // Initialize array for this date if it doesn't exist
            if (!imagesByDate.has(dateKey)) {
                imagesByDate.set(dateKey, []);
            }

            const dateImages = imagesByDate.get(dateKey)!;

            // Extract image URL from media
            if (media.url) {
                dateImages.push(media.url);
            } else if (media.image?.url) {
                dateImages.push(media.image.url);
            } else if (media.original_media?.url) {
                dateImages.push(media.original_media.url);
            }
        });

        // Convert Map to array of sections, sorted by date (newest first)
        const sections = Array.from(imagesByDate.entries())
            .map(([date, images]) => ({
                title: date,
                data: images,
            }))
            .sort((a, b) => {
                const dateA = new Date(a.title);
                const dateB = new Date(b.title);
                return dateB.getTime() - dateA.getTime();
            });

        return sections;
    }, [archivedData?.data]);

    // Create imageUrlToMediaIdMap
    const imageUrlToMediaIdMap = useMemo(() => {
        const map = new Map<string, number | string>();
        if (!archivedData?.data || !Array.isArray(archivedData.data)) return map;

        archivedData.data.forEach((media: any) => {
            const mediaId = media.id || media.media_id;
            if (!mediaId) return;

            // Extract image URL from media
            let imageUrl: string | undefined;
            if (media.url) {
                imageUrl = media.url;
            } else if (media.image?.url) {
                imageUrl = media.image.url;
            } else if (media.original_media?.url) {
                imageUrl = media.original_media.url;
            }

            if (imageUrl) {
                map.set(imageUrl, mediaId);
            }
        });

        return map;
    }, [archivedData?.data]);

    // Create imageUrlToBookmarkMap
    const imageUrlToBookmarkMap = useMemo(() => {
        const map = new Map<string, boolean>();
        if (!archivedData?.data || !Array.isArray(archivedData.data)) return map;

        archivedData.data.forEach((media: any) => {
            const isBookmarked = media.is_bookmarked ?? false;

            // Extract image URL from media
            let imageUrl: string | undefined;
            if (media.url) {
                imageUrl = media.url;
            } else if (media.image?.url) {
                imageUrl = media.image.url;
            } else if (media.original_media?.url) {
                imageUrl = media.original_media.url;
            }

            if (imageUrl) {
                map.set(imageUrl, isBookmarked);
            }
        });

        return map;
    }, [archivedData?.data]);

    const hasPhotos = gallerySections.length > 0 && gallerySections.some((section) => section.data.length > 0);

    return (
        <View style={[styles.container, { paddingTop: insets.top + headerHeight }]}>
            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : hasPhotos ? (
                <GalleryWithMenu
                    menuItems={[
                        {
                            icon: "square.and.arrow.up",
                            label: "Share",
                            role: "default",
                            onPress: async (imageUri: string) => {
                                try {
                                    const message = `Archived photo\n\nImage link: ${imageUri}`;
                                    await Share.share({
                                        message: message,
                                        url: imageUri,
                                    });
                                } catch (error: any) {
                                    console.error("Error sharing image:", error);
                                    if (error?.message !== "User did not share") {
                                        Alert.alert("Error", "Failed to share image");
                                    }
                                }
                            },
                        },
                    ]}
                    sections={gallerySections}
                    imageUrlToMediaIdMap={imageUrlToMediaIdMap}
                    imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                    patientId={id}
                    actions={{
                        showBookmark: false,
                        showEdit: false,
                        showArchive: false,
                        showShare: true,
                    }}
                    initialColumns={2}
                    minColumns={2}
                    maxColumns={6}
                />
            ) : (
                <View style={styles.centerContainer}>
                    <BaseText type="Title2" weight="600" color="labels.secondary">
                        No archived photos
                    </BaseText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
