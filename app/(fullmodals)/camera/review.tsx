import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { CapturedPhoto } from "@/utils/types/camera.types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Dimensions, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const MINT_COLOR = "#00c7be";

export default function ReviewScreen() {
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const { patientId, patientName, patientAvatar, doctorName, photos } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
        photos: string;
    }>();

    const capturedPhotos: CapturedPhoto[] = photos ? JSON.parse(photos) : [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set(capturedPhotos.map((p) => p.id)));
    const [isSaving, setIsSaving] = useState(false);

    const currentPhoto = capturedPhotos[currentIndex];

    const handleThumbnailPress = (index: number) => {
        Haptics.selectionAsync();
        setCurrentIndex(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
    };

    const handleToggleSelect = (photoId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPhotos((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    };

    const handleRetake = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Go back to capture with current photo's template selected
        const updatedPhotos = capturedPhotos.filter((p) => p.id !== currentPhoto.id);

        router.replace({
            pathname: "/(fullmodals)/camera/capture",
            params: {
                patientId,
                patientName,
                patientAvatar,
                doctorName,
                templates: JSON.stringify(capturedPhotos.map((p) => p.templateId)),
                existingPhotos: JSON.stringify(updatedPhotos),
                retakeTemplateId: currentPhoto.templateId,
            },
        });
    };

    const handleSave = async () => {
        const photosToSave = capturedPhotos.filter((p) => selectedPhotos.has(p.id));

        if (photosToSave.length === 0) {
            Alert.alert("No Photos Selected", "Please select at least one photo to save.");
            return;
        }

        setIsSaving(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            // TODO: Implement actual save logic here
            // This would typically upload photos to your backend

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Success - go back to patient details
            router.dismissAll();
        } catch (error) {
            Alert.alert("Error", "Failed to save photos. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert("Discard Photos?", "Are you sure you want to discard all captured photos?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Discard",
                style: "destructive",
                onPress: () => router.dismissAll(),
            },
        ]);
    };

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex && index >= 0 && index < capturedPhotos.length) {
            setCurrentIndex(index);
        }
    };

    const renderMainImage = ({ item, index }: { item: CapturedPhoto; index: number }) => {
        const isSelected = selectedPhotos.has(item.id);

        return (
            <View style={styles.mainImageContainer}>
                <Image source={{ uri: item.uri }} style={styles.mainImage} contentFit="contain" />

                {/* Selection overlay */}
                <TouchableOpacity style={[styles.selectionOverlay, !isSelected && styles.deselectedOverlay]} onPress={() => handleToggleSelect(item.id)} activeOpacity={0.9}>
                    <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>{isSelected && <IconSymbol name="checkmark" size={16} color={colors.system.white} />}</View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <IconSymbol name="chevron.left" size={24} color={colors.labels.primary} />
                </TouchableOpacity>

                <View style={styles.patientInfo}>
                    <Avatar name={patientName || "Patient"} size={32} haveRing imageUrl={patientAvatar} />
                    <View>
                        <BaseText type="Subhead" weight={600} color="labels.primary">
                            {patientName}
                        </BaseText>
                        <BaseText type="Caption2" color="labels.secondary">
                            {doctorName}
                        </BaseText>
                    </View>
                </View>

                <View style={{ width: 36 }} />
            </View>

            {/* Main Image Carousel */}
            <View style={styles.carouselContainer}>
                <FlatList
                    ref={flatListRef}
                    data={capturedPhotos}
                    renderItem={renderMainImage}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                />

                {/* Retake button overlay */}
                <View style={styles.retakeContainer}>
                    <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                        <BaseText type="Subhead" color="labels.primary">
                            Retake
                        </BaseText>
                    </TouchableOpacity>
                </View>

                {/* Page indicator */}
                <View style={styles.pageIndicator}>
                    <BaseText type="Caption1" color="labels.secondary">
                        {currentIndex + 1} / {capturedPhotos.length}
                    </BaseText>
                </View>
            </View>

            {/* Thumbnails */}
            <View style={styles.thumbnailsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsScroll}>
                    {capturedPhotos.map((photo, index) => {
                        const isActive = index === currentIndex;
                        const isSelected = selectedPhotos.has(photo.id);

                        return (
                            <Animated.View key={photo.id} entering={FadeInDown.delay(index * 50).springify()}>
                                <TouchableOpacity style={[styles.thumbnail, isActive && styles.thumbnailActive, !isSelected && styles.thumbnailDeselected]} onPress={() => handleThumbnailPress(index)} activeOpacity={0.8}>
                                    <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />

                                    {isSelected && (
                                        <View style={styles.thumbnailCheck}>
                                            <IconSymbol name="checkmark.circle.fill" size={16} color={MINT_COLOR} />
                                        </View>
                                    )}

                                    {!isSelected && <View style={styles.thumbnailDeselectedOverlay} />}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.footerInfo}>
                    <BaseText type="Caption1" color="labels.secondary">
                        {selectedPhotos.size} of {capturedPhotos.length} photos selected
                    </BaseText>
                </View>

                <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} activeOpacity={0.8} disabled={isSaving || selectedPhotos.size === 0}>
                    {isSaving ? (
                        <BaseText type="Body" weight={600} color="system.white">
                            Saving...
                        </BaseText>
                    ) : (
                        <BaseText type="Body" weight={600} color="system.white">
                            Save to gallery
                        </BaseText>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.gray6,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.system.white,
    },
    closeButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    patientInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    carouselContainer: {
        flex: 1,
        backgroundColor: colors.system.white,
        marginTop: 1,
    },
    mainImageContainer: {
        width: width,
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 20,
    },
    mainImage: {
        width: width - 40,
        height: "100%",
        borderRadius: 16,
    },
    selectionOverlay: {
        position: "absolute",
        top: 30,
        right: 30,
    },
    deselectedOverlay: {},
    selectionCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.system.white,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    selectionCircleActive: {
        backgroundColor: MINT_COLOR,
        borderColor: MINT_COLOR,
    },
    retakeContainer: {
        position: "absolute",
        bottom: 20,
        alignSelf: "center",
    },
    retakeButton: {
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pageIndicator: {
        position: "absolute",
        bottom: 70,
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    thumbnailsSection: {
        backgroundColor: colors.system.white,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    thumbnailsScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "transparent",
    },
    thumbnailActive: {
        borderColor: MINT_COLOR,
    },
    thumbnailDeselected: {
        opacity: 0.5,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailCheck: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: colors.system.white,
        borderRadius: 8,
    },
    thumbnailDeselectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.4)",
    },
    footer: {
        backgroundColor: colors.system.white,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerInfo: {
        alignItems: "center",
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: MINT_COLOR,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonDisabled: {
        backgroundColor: colors.system.gray3,
    },
});
