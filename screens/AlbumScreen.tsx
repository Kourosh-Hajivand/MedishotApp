import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import BaseButton from "@/components/button/BaseButton";
import { GalleryWithMenu } from "@/components/Image/GalleryWithMenu";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useBookmarkMedia, useUnbookmarkMedia } from "@/utils/hook/useMedia";
import { useGetPatients } from "@/utils/hook/usePatient";
import { useGetPracticeAlbums } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Gost, Media, PatientMedia, PatientMediaAlbum, PatientMediaWithTemplate } from "@/utils/service/models/ResponseModels";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, SlideInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const AlbumScreen: React.FC = () => {
    const { selectedPractice } = useProfileStore();
    const [selectedImage, setSelectedImage] = useState<Media | null>(null);
    const [bookmarkedImages, setBookmarkedImages] = useState<Set<number>>(new Set());
    const [animationKey, setAnimationKey] = useState(0);
    const [selectedGostId, setSelectedGostId] = useState<number | null>(null);

    // Reset animation key when screen is focused to replay animations
    useFocusEffect(
        useCallback(() => {
            setAnimationKey((prev) => prev + 1);
        }, []),
    );

    // Get albums for the practice
    const { data: albumsData, isLoading: isLoadingPhotos, error: albumsError, isError: isAlbumsError, refetch: refetchAlbums } = useGetPracticeAlbums(selectedPractice?.id ?? 0, !!selectedPractice?.id);

    // Parse response - it's an array of PatientMediaAlbum
    const albums = useMemo(() => {
        if (!albumsData?.data || !Array.isArray(albumsData.data)) return [];
        // Check if data is an array of PatientMediaAlbum (has gost and media properties)
        const data = albumsData.data as unknown as PatientMediaAlbum[];
        if (data.length > 0 && data[0]?.gost && data[0]?.media) {
            return data;
        }
        return [];
    }, [albumsData?.data]);

    // Extract raw media data for GalleryWithMenu (for template media support)
    const rawMediaData = useMemo(() => {
        if (!albums?.length) return [];
        interface RawMediaDataItem {
            id: number | string;
            template?: {
                id: number | string;
                [key: string]: any;
            } | null;
            original_media?: {
                url: string;
                [key: string]: any;
            } | null;
            taker?: {
                id?: number;
                first_name?: string | null;
                last_name?: string | null;
                email?: string | null;
            } | null;
            created_at?: string;
            images?: Array<{
                image?: {
                    url: string;
                    [key: string]: any;
                } | null;
                created_at?: string;
                [key: string]: any;
            }>;
            [key: string]: any;
        }

        const mediaArray: RawMediaDataItem[] = [];
        albums.forEach((album) => {
            if (album.media?.length) {
                album.media.forEach((mediaItem) => {
                    // Type guard: check if mediaItem has template property
                    // PatientMedia can have template in data field or as extended property
                    const mediaWithTemplate = mediaItem as PatientMedia & Partial<PatientMediaWithTemplate>;

                    // Add all media items (both template and non-template) to rawMediaData
                    // This ensures taker and created_at are available for all media items
                    const rawItem: RawMediaDataItem = {
                        id: mediaItem.id,
                        template: mediaWithTemplate.template
                            ? ({
                                  id: (mediaWithTemplate.template as { id?: number | string }).id || mediaItem.id,
                              } as { id: number | string; [key: string]: any })
                            : null,
                        original_media: mediaWithTemplate.original_media
                            ? {
                                  url: mediaWithTemplate.original_media.url,
                              }
                            : null,
                        taker: mediaWithTemplate.taker || null,
                        created_at: mediaWithTemplate.created_at ? mediaWithTemplate.created_at : undefined,
                        images: mediaWithTemplate.images ? (mediaWithTemplate.images as any[]) : undefined,
                    };
                    mediaArray.push(rawItem);
                });
            }
        });
        return mediaArray;
    }, [albums]);

    // Extract unique gosts and group photos by gost, also extract patientId
    const { gostsWithPhotos, extractedPatientId, allOnlyPhotos } = useMemo(() => {
        if (!albums || albums.length === 0) return { gostsWithPhotos: [], extractedPatientId: null, allOnlyPhotos: [] };

        const gostMap = new Map<number, { gost: Gost; photos: Media[] }>();
        let patientId: number | null = null;
        const allOnlyPhotosMap = new Map<string, Media>(); // Use Map to prevent duplicates (key: id-url)

        // First, collect all unique gosts from albums
        albums.forEach((album) => {
            const gostId = album.gost.id;
            if (!gostMap.has(gostId)) {
                gostMap.set(gostId, { gost: album.gost, photos: [] });
            }
        });

        // Then, collect all images from all albums and group by gost_id
        albums.forEach((album) => {
            album.media.forEach((mediaItem) => {
                // Extract patientId from first media item
                if (!patientId && mediaItem.patient_id) {
                    patientId = mediaItem.patient_id;
                }

                // Type guard: check if mediaItem has template property
                // PatientMedia can have template in data field or as extended property
                const mediaWithTemplate = mediaItem as PatientMedia & Partial<PatientMediaWithTemplate>;
                const hasTemplate = mediaWithTemplate.template || (mediaWithTemplate.data && typeof mediaWithTemplate.data === "object" && "template" in mediaWithTemplate.data);

                // If media has a template, show composite in "All" tab and individual images in gost tabs
                if (hasTemplate && mediaItem.original_media?.url) {
                    // Add composite (original_media) to allOnlyPhotos (will appear only in "All" tab)
                    const compositeMediaObj: Media = {
                        id: mediaItem.id,
                        url: mediaItem.original_media.url,
                        created_at: mediaItem.created_at || "",
                        updated_at: mediaItem.created_at || "",
                    };
                    const compositeUniqueKey = `${compositeMediaObj.id}-${compositeMediaObj.url}`;
                    if (!allOnlyPhotosMap.has(compositeUniqueKey)) {
                        allOnlyPhotosMap.set(compositeUniqueKey, compositeMediaObj);
                    }

                    // Add individual images to their respective gosts (will appear in gost tabs)
                    if (mediaWithTemplate.images && Array.isArray(mediaWithTemplate.images) && mediaWithTemplate.images.length > 0) {
                        mediaWithTemplate.images.forEach((imageItem) => {
                            const imageGostId = imageItem?.gost?.id;
                            if (imageGostId && imageItem?.image && gostMap.has(imageGostId)) {
                                const imageUrl = typeof imageItem.image === "string" ? imageItem.image : (imageItem.image?.url || null);

                                if (imageUrl) {
                                    // Use mediaItem.id (patient_media) so bookmark state and API use the same id
                                    const imageMediaObj: Media = {
                                        id: mediaItem.id,
                                        url: imageUrl,
                                        created_at: imageItem.created_at || mediaItem.created_at || "",
                                        updated_at: imageItem.updated_at || mediaItem.created_at || "",
                                    };

                                    // Prevent duplicate in each gost
                                    const gostPhotos = gostMap.get(imageGostId)!.photos;
                                    const isDuplicate = gostPhotos.some((photo) => photo.id === imageMediaObj.id && photo.url === imageMediaObj.url);
                                    if (!isDuplicate) {
                                        gostPhotos.push(imageMediaObj);
                                    }
                                }
                            }
                        });
                    }
                } else if (hasTemplate && !mediaItem.original_media?.url && mediaWithTemplate.images && Array.isArray(mediaWithTemplate.images)) {
                    // Template media without original_media (e.g. single template): show like a normal photo in both "All" and gost tab
                    mediaWithTemplate.images.forEach((imageItem: (typeof mediaWithTemplate.images)[0]) => {
                        if (imageItem?.image) {
                            const imageUrl = typeof imageItem.image === "string" ? imageItem.image : (imageItem.image?.url || null);

                            if (imageUrl) {
                                // Use mediaItem.id (patient_media) so bookmark state and API use the same id
                                const mediaObj: Media = {
                                    id: mediaItem.id,
                                    url: imageUrl,
                                    created_at: imageItem.created_at || mediaItem.created_at || "",
                                    updated_at: imageItem.updated_at || mediaItem.created_at || "",
                                };

                                // Add to allOnlyPhotos (shows in "All" tab)
                                const uniqueKey = `${mediaObj.id}-${mediaObj.url}`;
                                if (!allOnlyPhotosMap.has(uniqueKey)) {
                                    allOnlyPhotosMap.set(uniqueKey, mediaObj);
                                }

                                // Add to gost tab too so it shows like a normal photo in the album (e.g. "Front Face")
                                const imageGostId = imageItem?.gost?.id;
                                if (imageGostId && gostMap.has(imageGostId)) {
                                    const gostPhotos = gostMap.get(imageGostId)!.photos;
                                    const isDuplicate = gostPhotos.some((photo) => photo.id === mediaObj.id && photo.url === mediaObj.url);
                                    if (!isDuplicate) {
                                        gostPhotos.push(mediaObj);
                                    }
                                }
                            }
                        }
                    });
                } else if (mediaWithTemplate.images && Array.isArray(mediaWithTemplate.images) && mediaWithTemplate.images.length > 0) {
                    // For non-template media with images, show all images
                    mediaWithTemplate.images.forEach((imageItem: (typeof mediaWithTemplate.images)[0]) => {
                        const imageGostId = imageItem?.gost?.id;
                        if (imageGostId && imageItem?.image && gostMap.has(imageGostId)) {
                            // Add the image Media object
                            const imageUrl = typeof imageItem.image === "string" ? imageItem.image : null;

                            if (imageUrl) {
                                const mediaObj: Media = {
                                    id: imageItem.id || Date.now(),
                                    url: imageUrl,
                                    created_at: imageItem.created_at,
                                    updated_at: imageItem.updated_at || imageItem.created_at,
                                };
                                gostMap.get(imageGostId)!.photos.push(mediaObj);
                            }
                        }
                    });
                } else if (mediaItem.original_media?.url) {
                    // Fallback: no template, empty images array, but original_media exists
                    // Add original_media to this album's gost tab and "All" tab
                    const gostId = album.gost.id;
                    const mediaObj: Media = {
                        id: mediaItem.id,
                        url: mediaItem.original_media.url,
                        created_at: mediaItem.created_at || "",
                        updated_at: mediaItem.created_at || "",
                    };

                    if (gostMap.has(gostId)) {
                        const gostPhotos = gostMap.get(gostId)!.photos;
                        const isDuplicate = gostPhotos.some((photo) => photo.id === mediaObj.id && photo.url === mediaObj.url);
                        if (!isDuplicate) {
                            gostPhotos.push(mediaObj);
                        }
                    }

                    // Also add to allOnlyPhotos so it shows in "All" tab
                    const uniqueKey = `${mediaObj.id}-${mediaObj.url}`;
                    if (!allOnlyPhotosMap.has(uniqueKey)) {
                        allOnlyPhotosMap.set(uniqueKey, mediaObj);
                    }
                }
            });
        });

        return {
            gostsWithPhotos: Array.from(gostMap.values()).sort((a, b) => {
                // Sort by gost name
                return a.gost.name.localeCompare(b.gost.name);
            }),
            extractedPatientId: patientId,
            allOnlyPhotos: Array.from(allOnlyPhotosMap.values()),
        };
    }, [albums]);

    // Initialize bookmarkedImages from API data
    React.useEffect(() => {
        if (!albums || albums.length === 0) return;
        const bookmarkedIds = new Set<number>();
        albums.forEach((album) => {
            album.media.forEach((mediaItem) => {
                if (mediaItem.is_bookmarked) {
                    bookmarkedIds.add(mediaItem.id);
                }
            });
        });
        if (bookmarkedIds.size > 0) {
            setBookmarkedImages(bookmarkedIds);
        }
    }, [albums]);

    // Set "All" as selected by default (null means "All")
    React.useEffect(() => {
        if (gostsWithPhotos.length > 0 && selectedGostId === null) {
            // Keep null for "All" tab
            return;
        }
    }, [gostsWithPhotos, selectedGostId]);

    // Get all photos for "All" tab, sorted by created_at (newest first)
    // Use Map to prevent duplicates (key: mediaId-url)
    // In "All" tab: show composite if exists, otherwise show individual images
    const allPhotos = useMemo(() => {
        const uniquePhotosMap = new Map<string, Media>();

        // Add all-only photos (composite for template with original_media, individual images for template without original_media)
        allOnlyPhotos.forEach((photo) => {
            const uniqueKey = `${photo.id}-${photo.url}`;
            if (!uniquePhotosMap.has(uniqueKey)) {
                uniquePhotosMap.set(uniqueKey, photo);
            }
        });

        // Convert Map to array and sort by created_at (newest first)
        const all = Array.from(uniquePhotosMap.values());
        return all.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
    }, [gostsWithPhotos, allOnlyPhotos]);

    // Get photos for selected gost (null = "All"), sorted by created_at (newest first)
    const photos = useMemo(() => {
        let result: Media[] = [];
        if (selectedGostId === null) {
            // Return all photos when "All" is selected (already sorted in allPhotos)
            result = allPhotos;
        } else {
            const selectedGost = gostsWithPhotos.find((g) => g.gost.id === selectedGostId);
            result = selectedGost?.photos || [];
            // Sort by created_at (newest first)
            result = [...result].sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
        }
        return result;
    }, [selectedGostId, gostsWithPhotos, allPhotos]);

    // Get recent patients (6 most recent)
    const { data: patientsData } = useGetPatients(selectedPractice?.id, { per_page: 6 });
    const recentPatients = useMemo(() => {
        if (!patientsData?.data?.length) return [];
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

    // Group photos by date and convert to sections format for GalleryWithMenu
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
            .map(([date, images]) => {
                // Sort images within each section by created_at (newest first)
                const sortedImages = [...images].sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA; // Newest first
                });
                return { title: date, data: sortedImages };
            })
            .sort((a, b) => {
                // Sort sections by date (newest first)
                // Get the most recent photo from each section to determine section order
                const mostRecentA = a.data[0]?.created_at ? new Date(a.data[0].created_at).getTime() : 0;
                const mostRecentB = b.data[0]?.created_at ? new Date(b.data[0].created_at).getTime() : 0;
                return mostRecentB - mostRecentA;
            });
    }, [photos]);

    // Convert groupedPhotos to sections format (array of URLs)
    const gallerySections = useMemo(() => {
        return groupedPhotos.map((section) => ({
            title: section.title,
            data: section.data.map((photo) => photo.url),
        }));
    }, [groupedPhotos]);

    // Create map from image URL to media ID (include template sub-images so viewer slides show correct id)
    const imageUrlToMediaIdMap = useMemo(() => {
        const map = new Map<string, number>();
        photos.forEach((photo) => {
            if (photo.url) {
                map.set(photo.url, photo.id);
            }
        });
        // For template media: add original_media + each image URL -> patient_media id (so slides in viewer have correct bookmark id)
        rawMediaData.forEach((item) => {
            const mediaId = typeof item.id === "number" ? item.id : Number(item.id);
            if (!item.template || Number.isNaN(mediaId)) return;
            if (item.original_media?.url) {
                map.set(item.original_media.url, mediaId);
            }
            item.images?.forEach((img: { image?: { url?: string } | null }) => {
                const url = img?.image && typeof img.image === "object" ? img.image.url : null;
                if (url) map.set(url, mediaId);
            });
        });
        return map;
    }, [photos, rawMediaData]);

    // Create map from image URL to bookmark status (include template sub-images so viewer slides show correct state)
    const imageUrlToBookmarkMap = useMemo(() => {
        const map = new Map<string, boolean>();
        photos.forEach((photo) => {
            if (photo.url) {
                map.set(photo.url, bookmarkedImages.has(photo.id));
            }
        });
        // For template media: same bookmark state for composite + all sub-images
        rawMediaData.forEach((item) => {
            const mediaId = typeof item.id === "number" ? item.id : Number(item.id);
            if (!item.template || Number.isNaN(mediaId)) return;
            const bookmarked = bookmarkedImages.has(mediaId);
            if (item.original_media?.url) {
                map.set(item.original_media.url, bookmarked);
            }
            item.images?.forEach((img: { image?: { url?: string } | null }) => {
                const url = img?.image && typeof img.image === "object" ? img.image.url : null;
                if (url) map.set(url, bookmarked);
            });
        });
        return map;
    }, [photos, bookmarkedImages, rawMediaData]);

    // Create map from image URL to created_at timestamp
    const imageUrlToCreatedAtMap = useMemo(() => {
        const map = new Map<string, string>();
        photos.forEach((photo) => {
            if (photo.url && photo.created_at) {
                map.set(photo.url, photo.created_at);
            }
        });
        return map;
    }, [photos]);

    // Determine view state
    const hasPhotos = photos.length > 0;
    const hasAlbums = gostsWithPhotos.length > 0;

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
    // Tab widths and positions tracking (null for "All" tab)
    const tabLayouts = useRef<Map<number | null, { x: number; width: number }>>(new Map());
    const tabsScrollViewRef = useRef<ScrollView>(null);
    const translateX = useSharedValue(0);
    const indicatorWidth = useSharedValue(0);

    // Update translateX and indicator width when selectedGostId changes
    React.useEffect(() => {
        if (tabLayouts.current.has(selectedGostId)) {
            const layout = tabLayouts.current.get(selectedGostId)!;
            // Sharp animation without bounce - using withTiming with very fast easing
            indicatorWidth.value = withTiming(layout.width, {
                duration: 200,
                easing: Easing.out(Easing.quad),
            });
            translateX.value = withTiming(layout.x, {
                duration: 200,
                easing: Easing.out(Easing.quad),
            });

            // Scroll to show selected tab fully visible with one item before and after
            const screenWidth = Dimensions.get("window").width;
            const padding = 20; // padding from contentContainerStyle
            // Calculate scroll to show full tab with one item before and after
            const scrollOffset = Math.max(0, layout.x - padding - 100); // 100px for previous item visibility

            tabsScrollViewRef.current?.scrollTo({
                x: scrollOffset,
                animated: true,
            });
        }
    }, [selectedGostId]);

    const animatedIndicatorStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            width: indicatorWidth.value,
        };
    });

    const handleGostSelect = (gostId: number | null) => {
        Haptics.selectionAsync();
        setSelectedGostId(gostId);
    };

    const insets = useSafeAreaInsets();

    // Show error state if there's an error
    if (isAlbumsError) {
        interface ErrorWithMessage {
            message?: string;
        }
        const errorMessage = (albumsError as ErrorWithMessage)?.message || "Failed to load albums. Please try again.";
        return (
            <View style={styles.errorContainer}>
                <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.system.red} />
                <BaseText type="Body" color="labels.primary" weight="600" style={{ marginTop: spacing["3"], marginBottom: spacing["1"] }}>
                    Failed to load albums
                </BaseText>
                <BaseText type="Footnote" color="labels.secondary" style={{ marginBottom: spacing["4"], textAlign: "center", paddingHorizontal: spacing["5"] }}>
                    {errorMessage}
                </BaseText>
                <BaseButton
                    label="Try Again"
                    ButtonStyle="Tinted"
                    size="Medium"
                    rounded={true}
                    onPress={() => {
                        refetchAlbums();
                    }}
                    leftIcon={<IconSymbol name="arrow.clockwise" size={20} color={colors.system.blue} />}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {isLoadingPhotos ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.system.blue} />
                </View>
            ) : !hasAlbums ? (
                <ScrollView style={[styles.content, { paddingTop: 0 }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
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
                        <View className="px-5 pt-12">
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
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Tabs Section */}
                    <View className="bg-white border-t border-t-white" style={{ borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 100 }}>
                        <ScrollView ref={tabsScrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                            <View className="flex-row relative">
                                {/* "All" Tab */}
                                <TouchableOpacity
                                    key="all"
                                    onPress={() => handleGostSelect(null)}
                                    onLayout={(event) => {
                                        const { x, width } = event.nativeEvent.layout;
                                        tabLayouts.current.set(null, { x, width });
                                        // Update indicator on first render
                                        if (selectedGostId === null && indicatorWidth.value === 0) {
                                            indicatorWidth.value = width;
                                            translateX.value = x;
                                        }
                                    }}
                                    style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                                >
                                    <BaseText type="Subhead" weight={selectedGostId === null ? 600 : 400} color={selectedGostId === null ? "system.blue" : "labels.secondary"} numberOfLines={1} ellipsizeMode="tail">
                                        All
                                    </BaseText>
                                </TouchableOpacity>
                                {/* Gost Tabs */}
                                {gostsWithPhotos.map(({ gost }, index) => {
                                    const isSelected = selectedGostId === gost.id;
                                    return (
                                        <TouchableOpacity
                                            key={gost.id}
                                            onPress={() => handleGostSelect(gost.id)}
                                            onLayout={(event) => {
                                                const { x, width } = event.nativeEvent.layout;
                                                tabLayouts.current.set(gost.id, { x, width });
                                                // Update indicator on first render
                                                if (isSelected && indicatorWidth.value === 0) {
                                                    indicatorWidth.value = width;
                                                    translateX.value = x;
                                                }
                                            }}
                                            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                                        >
                                            <BaseText type="Subhead" weight={isSelected ? 600 : 400} color={isSelected ? "system.blue" : "labels.secondary"} numberOfLines={1} ellipsizeMode="tail">
                                                {gost.name}
                                            </BaseText>
                                        </TouchableOpacity>
                                    );
                                })}
                                <Animated.View
                                    style={[
                                        {
                                            position: "absolute",
                                            bottom: 0,
                                            height: 3,
                                            backgroundColor: colors.system.blue,
                                            borderTopLeftRadius: 3,
                                            borderTopRightRadius: 3,
                                        },
                                        animatedIndicatorStyle,
                                    ]}
                                />
                            </View>
                        </ScrollView>
                    </View>

                    {/* Gallery View */}
                    {hasPhotos ? (
                        <GalleryWithMenu
                            menuItems={[
                                {
                                    icon: "square.and.arrow.up",
                                    label: "Share",
                                    role: "default",
                                    onPress: async (imageUri: string) => {
                                        try {
                                            const message = `Practice album photo\n\nImage link: ${imageUri}`;
                                            await Share.share({
                                                message: message,
                                                url: imageUri,
                                            });
                                        } catch (error: unknown) {
                                            // Only show error if user didn't cancel the share action
                                            const shareError = error as { message?: string };
                                            if (shareError?.message !== "User did not share") {
                                                Alert.alert("Error", "Failed to share image");
                                            }
                                        }
                                    },
                                },
                            ]}
                            sections={gallerySections}
                            imageUrlToMediaIdMap={imageUrlToMediaIdMap}
                            imageUrlToBookmarkMap={imageUrlToBookmarkMap}
                            imageUrlToCreatedAtMap={imageUrlToCreatedAtMap}
                            patientId={extractedPatientId ?? undefined}
                            rawMediaData={rawMediaData}
                            actions={{
                                showBookmark: true,
                                showShare: true,
                                showEdit: false,
                                showNote: false,
                                showArchive: false,
                                showMagic: false,
                                showCompare: false,
                            }}
                            initialColumns={2}
                            minColumns={2}
                            maxColumns={6}
                            description="taker"
                        />
                    ) : (
                        <View style={styles.emptyGalleryContainer}>
                            <BaseText type="Body" color="labels.secondary">
                                No photos available for this view
                            </BaseText>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    emptyGalleryContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
        paddingVertical: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 200,
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing["5"],
        backgroundColor: "white",
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
