import { BaseText } from "@/components";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import { useGetTrashMedia, useRestoreMedia } from "@/utils/hook";

import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Alert, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper function to format date
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
};

export default function PatientArchiveScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();

    console.log("PatientArchiveScreen: id from params:", id, "type:", typeof id);

    const { data: archivedData, isLoading, refetch } = useGetTrashMedia(id || "", !!id);

    const restoreMediaMutation = useRestoreMedia(
        () => {
            Alert.alert("Success", "Media restored successfully");
            refetch();
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to restore media");
        },
    );

    // Extract image URLs and create sections grouped by date
    const gallerySections = useMemo(() => {
        if (!archivedData?.data || !Array.isArray(archivedData.data)) {
            return [];
        }

        console.log("Archived data received:", archivedData.data.length, "items");

        // Map to store images grouped by date with timestamp for sorting
        const imagesByDate = new Map<string, { images: Array<{ url: string; timestamp: number }>; sectionTimestamp: number }>();

        archivedData.data.forEach((media: any) => {
            const createdAt = media.created_at || media.updated_at;
            if (!createdAt) return;

            const dateKey = formatDate(createdAt);
            const sectionTimestamp = new Date(createdAt).getTime();

            // Initialize array for this date if it doesn't exist
            if (!imagesByDate.has(dateKey)) {
                imagesByDate.set(dateKey, { images: [], sectionTimestamp });
            }

            const dateData = imagesByDate.get(dateKey)!;

            // If media has a template, only show original_media in gallery (not individual images)
            if (media.template && media.original_media?.url) {
                dateData.images.push({ url: media.original_media.url, timestamp: sectionTimestamp });
            }
            // If media has images array (template media without original_media, or non-template)
            else if (media.images && Array.isArray(media.images) && media.images.length > 0) {
                media.images.forEach((imageItem: any) => {
                    if (imageItem.image?.url) {
                        const imgTimestamp = imageItem.created_at ? new Date(imageItem.created_at).getTime() : sectionTimestamp;
                        dateData.images.push({ url: imageItem.image.url, timestamp: imgTimestamp });
                    }
                });
            }
            // Fallback to old structure for backward compatibility
            else {
                let imageUrl: string | undefined;
                if (media.url) {
                    imageUrl = media.url;
                } else if (media.image?.url) {
                    imageUrl = media.image.url;
                } else if (media.original_media?.url) {
                    imageUrl = media.original_media.url;
                }
                if (imageUrl) {
                    dateData.images.push({ url: imageUrl, timestamp: sectionTimestamp });
                }
            }
        });

        // Convert Map to array of sections, sorted by date (newest first)
        // Also sort images within each section by timestamp (newest first)
        const sections = Array.from(imagesByDate.entries())
            .map(([date, { images, sectionTimestamp }]) => {
                // Sort images within section by timestamp (newest first)
                const sortedImages = [...images]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((item) => item.url);
                return {
                    title: date,
                    data: sortedImages,
                    timestamp: sectionTimestamp,
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(({ title, data }) => ({ title, data })); // Remove timestamp from final result

        console.log(
            "Gallery sections created:",
            sections.length,
            "sections with",
            sections.reduce((sum, s) => sum + s.data.length, 0),
            "total images",
        );

        return sections;
    }, [archivedData?.data]);

    // Create mediaData array for ImageViewerModal (component will build maps internally)
    const mediaData = useMemo(() => {
        if (!archivedData?.data || !Array.isArray(archivedData.data)) return [];

        const items: Array<{ url: string; mediaId?: number | string; isBookmarked?: boolean; createdAt?: string }> = [];

        archivedData.data.forEach((media: any) => {
            const patientMediaId = media.id; // This is the patient_media_id needed for restore
            const isBookmarked = media.is_bookmarked ?? false;

            // Extract image URLs from media.images array
            if (media.images && Array.isArray(media.images)) {
                media.images.forEach((imageItem: any) => {
                    const imageUrl = imageItem.image?.url;
                    if (imageUrl) {
                        // Use image's created_at or fallback to media's created_at
                        const createdAt = imageItem.created_at || media.created_at || media.updated_at;
                        items.push({
                            url: imageUrl,
                            mediaId: patientMediaId,
                            isBookmarked,
                            createdAt,
                        });
                    }
                });
            }
            // Fallback to old structure for backward compatibility
            else {
                let imageUrl: string | undefined;
                if (media.url) {
                    imageUrl = media.url;
                } else if (media.image?.url) {
                    imageUrl = media.image.url;
                } else if (media.original_media?.url) {
                    imageUrl = media.original_media.url;
                }

                if (imageUrl) {
                    const createdAt = media.created_at || media.updated_at;
                    items.push({
                        url: imageUrl,
                        mediaId: patientMediaId,
                        isBookmarked,
                        createdAt,
                    });
                }
            }
        });

        return items;
    }, [archivedData?.data]);

    const hasPhotos = gallerySections.length > 0 && gallerySections.some((section) => section.data.length > 0);

    return (
        <View style={[styles.container, { paddingTop: headerHeight }]}>
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
                        {
                            icon: "arrow.uturn.backward",
                            label: "Restore",
                            role: "default",
                            onPress: async (imageUri: string) => {
                                const mediaItem = mediaData.find((item) => item.url === imageUri);
                                const mediaId = mediaItem?.mediaId;
                                if (!mediaId) {
                                    Alert.alert("Error", "Media ID not found");
                                    return;
                                }

                                Alert.alert("Restore Media", "Are you sure you want to restore this media?", [
                                    {
                                        text: "Cancel",
                                        style: "cancel",
                                    },
                                    {
                                        text: "Restore",
                                        style: "default",
                                        onPress: () => {
                                            restoreMediaMutation.mutate(mediaId);
                                        },
                                    },
                                ]);
                            },
                        },
                    ]}
                    sections={gallerySections}
                    mediaData={mediaData}
                    patientId={id}
                    rawMediaData={archivedData?.data}
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
