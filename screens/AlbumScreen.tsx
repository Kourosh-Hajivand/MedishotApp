import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useBookmarkMedia, useUnbookmarkMedia } from "@/utils/hook/useMedia";
import { useGetPatients } from "@/utils/hook/usePatient";
import { useGetPracticeAlbums } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Media } from "@/utils/service/models/ResponseModels";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const AlbumScreen: React.FC = () => {
    const { selectedPractice } = useProfileStore();
    const [selectedImage, setSelectedImage] = useState<Media | null>(null);
    const [bookmarkedImages, setBookmarkedImages] = useState<Set<number>>(new Set());
    const [animationKey, setAnimationKey] = useState(0);

    // Reset animation key when screen is focused to replay animations
    useFocusEffect(
        useCallback(() => {
            setAnimationKey((prev) => prev + 1);
        }, []),
    );

    // Get albums for the practice
    const { data: albumsData, isLoading: isLoadingPhotos } = useGetPracticeAlbums(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const photos = albumsData?.data || [];

    // Get recent patients (6 most recent)
    const { data: patientsData } = useGetPatients(selectedPractice?.id, { per_page: 6 });
    const recentPatients = useMemo(() => {
        if (!patientsData?.data) return [];
        // Sort by created_at descending to get most recent first
        return [...patientsData.data]
            .sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 6);
    }, [patientsData?.data]);

    // Bookmark mutations
    const { mutate: bookmarkMedia } = useBookmarkMedia(
        () => {
            if (selectedImage) {
                setBookmarkedImages((prev) => new Set([...prev, selectedImage.id]));
            }
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to bookmark image");
        },
    );

    const { mutate: unbookmarkMedia } = useUnbookmarkMedia(
        () => {
            if (selectedImage) {
                setBookmarkedImages((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedImage.id);
                    return newSet;
                });
            }
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to unbookmark image");
        },
    );

    // Group photos by date
    const groupedPhotos = useMemo(() => {
        if (!photos || photos.length === 0) return [];

        const imagesByDate = new Map<string, Media[]>();
        photos.forEach((photo) => {
            const createdAt = photo.created_at;
            if (!createdAt) return;

            const date = new Date(createdAt);
            const dateKey = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

            if (!imagesByDate.has(dateKey)) {
                imagesByDate.set(dateKey, []);
            }
            imagesByDate.get(dateKey)!.push(photo);
        });

        return Array.from(imagesByDate.entries())
            .map(([date, images]) => ({ title: date, data: images }))
            .sort((a, b) => {
                const dateA = new Date(a.title);
                const dateB = new Date(b.title);
                return dateB.getTime() - dateA.getTime();
            });
    }, [photos]);

    // Determine view state
    const hasPhotos = photos.length > 0;

    const handleImagePress = (photo: Media) => {
        setSelectedImage(photo);
    };

    const handleBookmarkToggle = () => {
        if (!selectedImage) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (bookmarkedImages.has(selectedImage.id)) {
            unbookmarkMedia(selectedImage.id);
        } else {
            bookmarkMedia(selectedImage.id);
        }
    };
    const insets = useSafeAreaInsets();
    return (
        <ScrollView style={[styles.content, { paddingTop: 0 }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {isLoadingPhotos ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.system.blue} />
                </View>
            ) : !hasPhotos ? (
                <>
                    {recentPatients.length > 0 ? (
                        <Animated.View key={`card-${animationKey}`} entering={FadeInDown.duration(600).delay(100).springify()}>
                            <LinearGradient colors={["#5856D6", "rgba(88, 86, 214, 0.00)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.createAlbumCard}>
                                <View className="w-full   items-center gap-4 flex-row">
                                    <View style={styles.cardImagesContainer}>
                                        {/* Overlapping placeholder images - 3 items only */}
                                        {[
                                            { image: require("@/assets/images/fakePatients/testImage.png"), index: 0 },
                                            { image: require("@/assets/images/fakePatients/testImage.png"), index: 1 },
                                            { image: require("@/assets/images/fakePatients/testImage.png"), index: 2 },
                                        ].map(({ image, index }) => {
                                            const rotations = [-23.685, -5.344, 8.869];
                                            const sizes = [46.346, 58.55, 85.326];
                                            const leftOffsets = [-59.37, -47.81, -30.22];
                                            const topOffsets = [-20.08, -35.78, -45.39];
                                            return (
                                                <Animated.View
                                                    key={index}
                                                    entering={FadeIn.duration(400)
                                                        .delay(200 + index * 100)
                                                        .springify()}
                                                    style={[
                                                        styles.overlappingImage,
                                                        {
                                                            width: sizes[index],
                                                            height: sizes[index],
                                                            left: 64 + leftOffsets[index],
                                                            top: 47 + topOffsets[index],
                                                            transform: [{ rotate: `${rotations[index]}deg` }],
                                                            zIndex: 3 + index,
                                                        },
                                                    ]}
                                                >
                                                    <Image source={image} style={styles.overlappingImageInner} contentFit="cover" />
                                                </Animated.View>
                                            );
                                        })}
                                    </View>
                                    <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.cardTextContainer}>
                                        <BaseText type="Body" weight="600" color="labels.primary" style={styles.cardTitle}>
                                            Create Practice Album.
                                        </BaseText>
                                        <BaseText type="Footnote" color="labels.secondary" style={styles.cardDescription}>
                                            You can add your favorite patient result's here.
                                        </BaseText>
                                    </Animated.View>
                                </View>
                                {/* Patients List */}
                                {recentPatients.length > 0 && (
                                    <Animated.View entering={SlideInDown.duration(500).delay(600).springify()} style={styles.patientsListContainer}>
                                        <BaseText type="Footnote" weight="600" color="labels.primary" style={styles.patientsListTitle}>
                                            Start with your last patient's:
                                        </BaseText>
                                        <View style={styles.patientsList}>
                                            {recentPatients.map((patient, index) => (
                                                <Animated.View
                                                    key={`${patient.id}-${index}`}
                                                    entering={FadeInDown.duration(300)
                                                        .delay(700 + index * 50)
                                                        .springify()}
                                                >
                                                    <TouchableOpacity onPress={() => router.push(`/patients/${patient.id}`)} style={[styles.listItem]} className={`flex-row items-center gap-3 px-4 py-2 bg-white ${index !== recentPatients.length - 1 ? "border-b border-gray-200" : ""}`}>
                                                        <Avatar haveRing name={patient.full_name} size={36} imageUrl={patient.profile_image?.url || undefined} color={patient.doctor?.color} />
                                                        <BaseText type="Callout" weight={500} color="labels.primary">
                                                            {patient.full_name}
                                                        </BaseText>
                                                    </TouchableOpacity>
                                                </Animated.View>
                                            ))}
                                        </View>
                                    </Animated.View>
                                )}
                            </LinearGradient>
                        </Animated.View>
                    ) : (
                        <View className="px-5">
                            <View className="bg-[#5856D6] p-5 rounded-2xl ">
                                <View className="w-full  items-center gap-4 flex-row">
                                    <View style={styles.cardImagesContainer}>
                                        {/* Overlapping placeholder images - 3 items only */}
                                        {[
                                            { image: require("@/assets/images/fakePatients/testImage.png"), index: 0 },
                                            { image: require("@/assets/images/fakePatients/testImage.png"), index: 1 },
                                            { image: require("@/assets/images/fakePatients/testImage.png"), index: 2 },
                                        ].map(({ image, index }) => {
                                            const rotations = [-23.685, -5.344, 8.869];
                                            const sizes = [46.346, 58.55, 85.326];
                                            const leftOffsets = [-59.37, -47.81, -30.22];
                                            const topOffsets = [-20.08, -35.78, -45.39];
                                            return (
                                                <Animated.View
                                                    key={index}
                                                    entering={FadeIn.duration(400)
                                                        .delay(200 + index * 100)
                                                        .springify()}
                                                    style={[
                                                        styles.overlappingImage,
                                                        {
                                                            width: sizes[index],
                                                            height: sizes[index],
                                                            left: 64 + leftOffsets[index],
                                                            top: 47 + topOffsets[index],
                                                            transform: [{ rotate: `${rotations[index]}deg` }],
                                                            zIndex: 3 + index,
                                                        },
                                                    ]}
                                                >
                                                    <Image source={image} style={styles.overlappingImageInner} contentFit="cover" />
                                                </Animated.View>
                                            );
                                        })}
                                    </View>
                                    <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.cardTextContainer}>
                                        <BaseText type="Body" weight="600" color="labels.primary" style={styles.cardTitle}>
                                            Create Practice Album.
                                        </BaseText>
                                        <BaseText type="Footnote" color="labels.secondary" style={styles.cardDescription}>
                                            You can add your favorite patient result's here.
                                        </BaseText>
                                    </Animated.View>
                                </View>
                            </View>
                        </View>
                    )}
                </>
            ) : (
                /* Gallery View */
                <View style={styles.galleryContainer}>
                    {groupedPhotos.map((section, sectionIndex) => (
                        <View key={sectionIndex} style={styles.gallerySection}>
                            <BaseText type="Footnote" weight="600" color="labels.tertiary" style={styles.gallerySectionTitle}>
                                {section.title}
                            </BaseText>
                            <View style={styles.galleryGrid}>
                                {section.data.map((photo) => (
                                    <TouchableOpacity key={photo.id} style={styles.galleryImageContainer} onPress={() => handleImagePress(photo)}>
                                        <Image source={{ uri: photo.url }} style={styles.galleryImage} contentFit="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
    },
    createAlbumCard: {
        padding: 20,
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
    },
    cardImagesContainer: {
        width: 128,
        height: 94,
        position: "relative",
    },
    overlappingImage: {
        position: "absolute",
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.system.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 14.7,
        elevation: 8,
        overflow: "hidden",
        backgroundColor: "transparent",
    },
    overlappingImageInner: {
        width: "100%",
        height: "100%",
        borderRadius: 6,
    },
    placeholderImage: {
        backgroundColor: colors.system.gray5,
        justifyContent: "center",
        alignItems: "center",
    },
    cardTextContainer: {
        flex: 1,
        gap: 4,
    },
    cardTitle: {
        color: colors.system.white,
        fontSize: 17,
        letterSpacing: -0.43,
    },
    cardDescription: {
        color: colors.system.white,
        fontSize: 13,
        letterSpacing: -0.08,
        opacity: 1,
    },
    patientsListContainer: {
        flex: 1,
        gap: 10,
        width: "100%",

        paddingVertical: 12,
        borderRadius: 24,
        overflow: "hidden",
    },
    patientsListTitle: {
        color: colors.system.white,
        fontSize: 13,
        letterSpacing: -0.08,
    },
    patientsList: {
        backgroundColor: colors.system.white,
        borderRadius: 24,
        overflow: "hidden",
    },
    patientRow: {
        paddingVertical: 8,
    },
    patientRowContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        gap: 12,
    },
    listItem: { flexDirection: "row", alignItems: "center", gap: spacing["3"], paddingVertical: spacing["2"] },
    patientAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1.969,
        borderColor: colors.system.blue,
        overflow: "hidden",
        backgroundColor: colors.system.white,
    },
    patientAvatarImage: {
        width: "100%",
        height: "100%",
    },
    patientAvatarPlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: colors.system.gray5,
        justifyContent: "center",
        alignItems: "center",
    },
    patientRowSeparator: {
        height: 0.33,
        backgroundColor: "rgba(0, 0, 0, 1)",
        marginTop: 8,
        marginHorizontal: 12,
    },
    galleryContainer: {
        gap: 0,
    },
    gallerySection: {
        marginBottom: 0,
    },
    gallerySectionTitle: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginBottom: 0,
        fontSize: 13,
        letterSpacing: -0.08,
    },
    galleryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 0.5,
    },
    galleryImageContainer: {
        width: (SCREEN_WIDTH - 40 - 0.5) / 2,
        height: (SCREEN_WIDTH - 40 - 0.5) / 2,
    },
    galleryImage: {
        width: "100%",
        height: "100%",
    },
});
