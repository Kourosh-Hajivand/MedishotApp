import { BaseText } from "@/components";
import { AppleGallery } from "@/components/Image/AppleGallery";
import { headerHeight } from "@/constants/theme";
import { useGetArchivedMedia } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ArchiveScreen() {
    const insets = useSafeAreaInsets();
    const { selectedPractice } = useProfileStore();
    const { data: archivedMedia, isLoading } = useGetArchivedMedia(selectedPractice?.id || 0, !!selectedPractice?.id);

    // Extract image URLs from media array
    const imageUrls = useMemo(() => {
        return archivedMedia?.data?.map((media) => media.url).filter(Boolean) || [];
    }, [archivedMedia?.data]);

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : imageUrls.length > 0 ? (
                <AppleGallery images={imageUrls} initialColumns={2} minColumns={2} maxColumns={6} />
            ) : (
                <View style={styles.centerContainer}>
                    <BaseText type="Title2" weight="600" color="labels.secondary">
                        No archived items
                    </BaseText>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    description: {
        marginTop: 8,
    },
});
