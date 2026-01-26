import { BaseText, ErrorState } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useTempUpload, useUploadPatientMedia, useUploadPatientMediaWithTemplate } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import { useGetTemplateById } from "@/utils/hook/useTemplate";
import { PracticeTemplate, TemplateCell, TemplateGost } from "@/utils/service/models/ResponseModels";
import { CapturedPhoto } from "@/utils/types/camera.types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";
import { CompositeLayout, CompositeLayoutTestModal, GhostItemData } from "./_components/composite-layout";
import { LayoutPattern } from "./_components/create-template/types";

const { width, height } = Dimensions.get("window");
const MINT_COLOR = "#00c7be";

// Thumbnail component to avoid hooks in map
const ThumbnailItem: React.FC<{
    photo: CapturedPhoto;
    index: number;
    isActive: boolean;
    onPress: (index: number) => void;
}> = React.memo(({ photo, index, isActive, onPress }) => {
    const borderRadius = useSharedValue(0);

    React.useEffect(() => {
        borderRadius.value = withTiming(10, { duration: 300 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            borderRadius: borderRadius.value,
        };
    });

    return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <Animated.View style={animatedStyle}>
                <TouchableOpacity style={[styles.thumbnail, isActive && styles.thumbnailActive]} onPress={() => onPress(index)} activeOpacity={0.8}>
                    <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
});

export default function ReviewScreen() {
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const { patientId, photos, templateId } = useLocalSearchParams<{
        patientId: string;
        photos: string;
        templateId?: string;
    }>();

    // Get patient data from API
    const { data: patientData, isLoading: isPatientLoading, error: patientError, isError: isPatientError, refetch: refetchPatient } = useGetPatientById(patientId || "");

    // Get template data from API
    const { data: templateData, error: templateError, isError: isTemplateError, refetch: refetchTemplate } = useGetTemplateById(templateId || "", !!templateId);

    // Extract patient info
    const patientName = useMemo(() => {
        if (!patientData?.data) return "Patient";
        return `${patientData.data.first_name} ${patientData.data.last_name}`;
    }, [patientData]);

    const patientAvatar = useMemo(() => {
        return patientData?.data?.profile_image?.url || undefined;
    }, [patientData]);

    const doctorName = useMemo(() => {
        if (!patientData?.data?.doctor) return "Dr. Name";
        return `Dr. ${patientData.data.doctor.first_name || ""} ${patientData.data.doctor.last_name || ""}`;
    }, [patientData]);

    const capturedPhotos: CapturedPhoto[] = photos ? JSON.parse(photos) : [];

    // Extract ghost items from template
    const ghostItemsData: GhostItemData[] = useMemo(() => {
        if (!templateData?.data) return [];

        const template = templateData.data as unknown as PracticeTemplate & { cells?: TemplateCell[]; gosts?: TemplateGost[] };
        const items: GhostItemData[] = [];

        if (template.cells && Array.isArray(template.cells) && template.cells.length > 0) {
            const sortedCells = [...template.cells].sort((a: TemplateCell, b: TemplateCell) => {
                if (a.row_index !== b.row_index) return a.row_index - b.row_index;
                return a.column_index - b.column_index;
            });
            items.push(
                ...sortedCells.map((cell: TemplateCell) => ({
                    gostId: String(cell.gost.id),
                    imageUrl: cell.gost.gost_image?.url || null,
                    rowIndex: cell.row_index,
                    columnIndex: cell.column_index,
                })),
            );
        } else {
            const templateGosts = template.gosts as TemplateGost[] | undefined;
            if (templateGosts && Array.isArray(templateGosts) && templateGosts.length > 0) {
                items.push(
                    ...templateGosts.map((gost: TemplateGost, index: number) => ({
                        gostId: String(gost.id),
                        imageUrl: gost.gost_image || null,
                        rowIndex: Math.floor(index / 2), // Assume 2 columns
                        columnIndex: index % 2,
                    })),
                );
            }
        }

        return items;
    }, [templateData]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [compositePhoto, setCompositePhoto] = useState<CapturedPhoto | null>(null);
    const [isGeneratingComposite, setIsGeneratingComposite] = useState(false);
    const [compositeLayoutReady, setCompositeLayoutReady] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);

    const compositeViewRef = useRef<ViewShot>(null);

    // Get layout pattern from template data
    const layoutPattern: LayoutPattern = useMemo(() => {
        const template = templateData?.data as unknown as PracticeTemplate;
        return (template?.layout_pattern as LayoutPattern) || "grid-2x2";
    }, [templateData]);

    // Ref to track upload progress for photos without template
    const uploadProgressRef = useRef({ count: 0, total: 0 });

    // Reset composite photo when capturedPhotos change (e.g., after retake)
    React.useEffect(() => {
        const hasTemplate = templateId && capturedPhotos.some((p) => p.templateId !== "no-template");

        if (hasTemplate && compositePhoto) {
            // Check if any template photo has changed by comparing timestamps
            // If a photo was retaken, its timestamp will be newer
            const templatePhotos = capturedPhotos.filter((p) => p.templateId !== "no-template");
            const hasNewerPhoto = templatePhotos.some((photo) => {
                // If composite was generated before this photo, we need to regenerate
                return photo.timestamp > compositePhoto.timestamp;
            });

            if (hasNewerPhoto) {
                setCompositePhoto(null);
                setIsGeneratingComposite(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [capturedPhotos]);

    // Generate composite photo when template photos are available
    React.useEffect(() => {
        const hasTemplate = templateId && capturedPhotos.some((p) => p.templateId !== "no-template");
        const allPhotosLoaded = capturedPhotos.every((p) => p.templateId === "no-template" || p.uri);

        if (hasTemplate && ghostItemsData.length > 0 && capturedPhotos.length > 0 && !compositePhoto && !isGeneratingComposite && compositeLayoutReady && allPhotosLoaded) {
            generateCompositePhoto();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId, capturedPhotos.length, ghostItemsData.length, compositeLayoutReady, compositePhoto]);

    const generateCompositePhoto = async () => {
        if (!templateId || ghostItemsData.length === 0 || capturedPhotos.length === 0) return;

        setIsGeneratingComposite(true);

        try {
            // Wait for images to load
            await new Promise((resolve) => setTimeout(resolve, 1000));

            if (!compositeViewRef.current) {
                setIsGeneratingComposite(false);
                return;
            }

            const uri = await captureRef(compositeViewRef.current, {
                format: "jpg",
                quality: 0.95,
                result: "tmpfile",
            });

            const newCompositePhoto: CapturedPhoto = {
                id: `composite-${Date.now()}`,
                uri,
                templateId: "composite",
                templateName: "Composite",
                timestamp: Date.now(),
                isCompleted: true,
                uploadStatus: "uploading",
                isComposite: true,
            };

            setCompositePhoto(newCompositePhoto);
            setCurrentIndex(0); // Reset to show composite photo first

            // Upload composite photo to temp-upload
            try {
                // Prepare file object for React Native FormData
                const filename = `composite-${Date.now()}.jpg`;
                const file: { uri: string; type: string; name: string } = {
                    uri: uri,
                    type: "image/jpeg",
                    name: filename,
                };

                tempUploadComposite(file);
            } catch (error) {
                // Still allow saving without composite media field
                setCompositePhoto({
                    ...newCompositePhoto,
                    uploadStatus: "pending",
                });
            }

            setIsGeneratingComposite(false);
        } catch (error) {
            setIsGeneratingComposite(false);
        }
    };

    // Hook for temp upload (for composite photo)
    const { mutate: tempUploadComposite } = useTempUpload(
        (data) => {
            // Extract filename from TempUploadResponse
            const filename = data?.filename;

            if (!filename) {
                return;
            }

            // Update composite photo with tempFilename using functional update
            setCompositePhoto((prev) => {
                if (prev) {
                    return {
                        ...prev,
                        tempFilename: filename,
                        uploadStatus: "success" as const,
                    };
                }
                return prev;
            });
        },
        (error) => {
            // Update status to error
            setCompositePhoto((prev) => {
                if (prev) {
                    return {
                        ...prev,
                        uploadStatus: "error",
                    };
                }
                return prev;
            });
        },
    );

    // Hooks for saving photos
    const { mutate: uploadMediaWithTemplate } = useUploadPatientMediaWithTemplate(
        () => {
            // Success - navigate back to patient detail and remove camera stack from history
            setIsSaving(false);
            // Go back twice to remove both review and camera from history, then navigate to patient detail
            // This ensures camera stack is removed from navigation history
            if (router.canGoBack()) {
                router.back(); // Go back from review to camera
            }
            setTimeout(() => {
                if (router.canGoBack()) {
                    router.back(); // Go back from camera to patient detail
                } else {
                    // Fallback: if can't go back, navigate directly
                    router.replace(`/patients/${patientId}` as any);
                }
            }, 100);
        },
        (error) => {
            Alert.alert("Error", "Failed to save photos. Please try again.");
            setIsSaving(false);
        },
    );

    const { mutate: uploadMedia } = useUploadPatientMedia(
        () => {
            // Increment upload count
            uploadProgressRef.current.count++;
            // Check if all uploads are complete
            if (uploadProgressRef.current.count >= uploadProgressRef.current.total) {
                setIsSaving(false);
                // Navigate back to patient detail and remove camera stack from history
                // Go back twice to remove both review and camera from history
                if (router.canGoBack()) {
                    router.back(); // Go back from review to camera
                }
                setTimeout(() => {
                    if (router.canGoBack()) {
                        router.back(); // Go back from camera to patient detail
                    } else {
                        // Fallback: if can't go back, navigate directly
                        router.replace(`/patients/${patientId}` as any);
                    }
                }, 100);
            }
        },
        (error) => {
            Alert.alert("Error", "Failed to save photos. Please try again.");
            setIsSaving(false);
        },
    );

    // Combine composite photo with captured photos (composite first)
    // If composite is being generated, add a placeholder with loading state
    const allPhotos = useMemo(() => {
        const photos = [...capturedPhotos];
        const hasTemplate = templateId && capturedPhotos.some((p) => p.templateId !== "no-template");

        if (hasTemplate) {
            if (compositePhoto) {
                photos.unshift(compositePhoto);
            } else if (isGeneratingComposite) {
                // Add placeholder for composite photo while generating
                photos.unshift({
                    id: "composite-placeholder",
                    uri: "",
                    templateId: "composite",
                    templateName: "Composite",
                    timestamp: Date.now(),
                    isCompleted: false,
                    uploadStatus: "uploading",
                    isComposite: true,
                } as CapturedPhoto);
            }
        }
        return photos;
    }, [capturedPhotos, compositePhoto, isGeneratingComposite, templateId]);

    // Scroll to composite photo when it's generated
    React.useEffect(() => {
        if (compositePhoto && allPhotos.length > 0) {
            setCurrentIndex(0);
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        }
    }, [compositePhoto]);

    const currentPhoto = allPhotos[currentIndex];

    const handleThumbnailPress = useCallback(
        (index: number) => {
            if (index === currentIndex) return; // Don't do anything if already on this index

            Haptics.selectionAsync();
            setIsScrolling(true);
            setCurrentIndex(index);
            // Use scrollToOffset for smoother scrolling without jump
            flatListRef.current?.scrollToOffset({ offset: index * width, animated: true });

            // Reset scrolling flag after animation completes
            setTimeout(() => {
                setIsScrolling(false);
            }, 300);
        },
        [currentIndex, width],
    );

    const handleRetake = useCallback(() => {
        // Don't allow retake for composite photo
        if (currentPhoto?.isComposite) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Go back to camera with templateId and retakeTemplateId to retake the current photo
        // The camera will navigate to the specific ghost item that needs to be retaken
        const retakeTemplateId = currentPhoto?.templateId;

        // Check if this is a photo without template (no-template)
        const isNoTemplate = retakeTemplateId === "no-template" || !templateId;

        // Get templateId from params or try to extract from photos
        // If we have multiple photos, they should all have the same templateId (from the same template)
        // But if it's "no-template", don't pass templateId
        let templateIdToUse: string | undefined = undefined;
        if (!isNoTemplate) {
            templateIdToUse = templateId || (capturedPhotos.length > 0 && capturedPhotos[0].templateId !== "no-template" ? capturedPhotos[0].templateId : undefined);
        }

        // Pass all captured photos except the one being retaken
        const photosToKeep = capturedPhotos.filter((p) => p.templateId !== retakeTemplateId);

        router.replace({
            pathname: "/camera" as any,
            params: {
                patientId,
                ...(templateIdToUse && { templateId: templateIdToUse }),
                ...(retakeTemplateId && retakeTemplateId !== "no-template" && { retakeTemplateId }),
                ...(photosToKeep.length > 0 && { capturedPhotos: JSON.stringify(photosToKeep) }), // Pass remaining photos if any
            },
        });
    }, [currentPhoto, templateId, capturedPhotos, patientId]);

    const handleSave = useCallback(async () => {
        const photosToSave = capturedPhotos;

        if (photosToSave.length === 0) {
            Alert.alert("No Photos", "No photos to save.");
            return;
        }

        // Check if all photos have tempFilename
        const photosWithoutFilename = photosToSave.filter((p) => !p.tempFilename);
        if (photosWithoutFilename.length > 0) {
            Alert.alert("Uploading...", "Some photos are still uploading. Please wait a moment and try again.");
            return;
        }

        // Check if composite photo is ready (for template uploads)
        const hasTemplate = templateId && photosToSave.some((p) => p.templateId !== "no-template");

        // Find composite photo from allPhotos (more reliable than state)
        const compositeFromAllPhotos = allPhotos.find((p) => p.isComposite);

        // Use compositeFromAllPhotos if available, otherwise fall back to state
        const finalCompositePhoto = compositeFromAllPhotos || compositePhoto;

        if (hasTemplate && (!finalCompositePhoto || !finalCompositePhoto.tempFilename || finalCompositePhoto.uploadStatus !== "success")) {
            Alert.alert("Please wait", "Composite image is still being generated. Please wait a moment.");
            return;
        }

        setIsSaving(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            if (hasTemplate && templateId) {
                // Upload with template: /patients/media/{patient}/with-template
                const templateIdNum = parseInt(templateId, 10);
                if (isNaN(templateIdNum)) {
                    throw new Error("Invalid template ID");
                }

                // Prepare images array - use tempFilename instead of file object
                const images = photosToSave
                    .filter((p) => p.templateId !== "no-template")
                    .map((photo) => {
                        const gostId = parseInt(photo.templateId, 10);
                        if (isNaN(gostId)) {
                            throw new Error(`Invalid gost ID: ${photo.templateId}`);
                        }

                        // Use tempFilename from temp-upload, fallback to error if not available
                        if (!photo.tempFilename) {
                            throw new Error(`Photo ${photo.id} does not have tempFilename. Please wait for upload to complete.`);
                        }

                        return {
                            gost_id: gostId,
                            media: photo.tempFilename, // Send only filename string, not file object
                            notes: photo.templateName || undefined,
                        };
                    });

                // Prepare request data
                const requestData: {
                    template_id: number;
                    type: string;
                    data: string;
                    images: Array<{ gost_id: number; media: string; notes?: string }>;
                    media?: string;
                } = {
                    template_id: templateIdNum,
                    type: "image",
                    data: JSON.stringify({}),
                    images: images,
                };

                // Add composite photo media if available (required for template uploads)
                if (finalCompositePhoto?.tempFilename) {
                    requestData.media = finalCompositePhoto.tempFilename;
                } else {
                    Alert.alert("Error", "Composite image is not ready yet. Please wait.");
                    setIsSaving(false);
                    return;
                }

                // Call API
                uploadMediaWithTemplate({
                    patientId,
                    data: requestData,
                });
            } else {
                // Upload without template: /patients/media/{patient}/albums
                // Upload each photo individually
                const photosWithoutTemplate = photosToSave.filter((p) => p.templateId === "no-template");

                if (photosWithoutTemplate.length === 0) {
                    Alert.alert("Error", "No photos to upload.");
                    setIsSaving(false);
                    return;
                }

                // Reset upload progress
                uploadProgressRef.current.count = 0;
                uploadProgressRef.current.total = photosWithoutTemplate.length;

                photosWithoutTemplate.forEach((photo, index) => {
                    // Use tempFilename from temp-upload, fallback to error if not available
                    if (!photo.tempFilename) {
                        Alert.alert("Error", `Photo ${index + 1} is still uploading. Please wait.`);
                        setIsSaving(false);
                        return;
                    }

                    const requestData = {
                        media: photo.tempFilename, // Send only filename string, not file object
                        type: "image",
                        data: {},
                    };

                    // Call API
                    uploadMedia({
                        patientId,
                        data: requestData,
                    });
                });
            }
        } catch (error) {
            Alert.alert("Error", "Failed to save photos. Please try again.");
            setIsSaving(false);
        }
    }, [capturedPhotos, templateId, allPhotos, compositePhoto, uploadMediaWithTemplate, uploadMedia, patientId]);

    const handleClose = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert("Discard Photos?", "Are you sure you want to discard all captured photos?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Discard",
                style: "destructive",
                onPress: () => {
                    // Navigate back to patient detail and remove camera stack from history
                    // Go back twice to remove both review and camera from history
                    if (router.canGoBack()) {
                        router.back(); // Go back from review to camera
                    }
                    setTimeout(() => {
                        if (router.canGoBack()) {
                            router.back(); // Go back from camera to patient detail
                        } else {
                            // Fallback: if can't go back, navigate directly
                            router.replace(`/patients/${patientId}` as any);
                        }
                    }, 100);
                },
            },
        ]);
    }, [patientId]);

    const handleScroll = useCallback(
        (event: { nativeEvent: { contentOffset: { x: number } } }) => {
            // Don't update index if we're programmatically scrolling
            if (isScrolling) return;

            const offsetX = event.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / width);
            if (index !== currentIndex && index >= 0 && index < allPhotos.length) {
                setCurrentIndex(index);
            }
        },
        [isScrolling, width, currentIndex, allPhotos.length],
    );

    const renderMainImage = useCallback(
        ({ item, index }: { item: CapturedPhoto; index: number }) => {
            const isCompositeLoading = item.isComposite && (!item.uri || isGeneratingComposite || item.uploadStatus === "uploading");

            return (
                <View style={styles.mainImageContainer}>
                    {isCompositeLoading ? (
                        <View style={[styles.mainImage, { justifyContent: "center", alignItems: "center", backgroundColor: colors.system.white }]}>
                            <ActivityIndicator size="large" color={colors.system.blue} />
                            <BaseText type="Body" weight={400} color="labels.secondary" style={{ marginTop: 16 }}>
                                Generating composite image...
                            </BaseText>
                        </View>
                    ) : item.uri ? (
                        <Image source={{ uri: item.uri }} style={styles.mainImage} contentFit="contain" />
                    ) : null}
                </View>
            );
        },
        [isGeneratingComposite],
    );

    // Check if we need to wait for composite photo
    const hasTemplate = templateId && capturedPhotos.some((p) => p.templateId !== "no-template");
    const isCompositeGenerating = hasTemplate && (isGeneratingComposite || (compositePhoto && compositePhoto.uploadStatus === "uploading"));

    // Loading state
    if (isPatientLoading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    // Error state
    if (isPatientError || (templateId && isTemplateError)) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }]}>
                <ErrorState
                    title={isPatientError ? "Failed to load patient" : "Failed to load template"}
                    message={
                        isPatientError
                            ? patientError instanceof Error
                                ? patientError.message
                                : (patientError as unknown as { message?: string })?.message || "Failed to load patient data"
                            : templateError instanceof Error
                              ? templateError.message
                              : (templateError as unknown as { message?: string })?.message || "Failed to load template data"
                    }
                    onRetry={() => {
                        if (isPatientError) refetchPatient();
                        if (templateId && isTemplateError) refetchTemplate();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <IconSymbol name="chevron.left" size={24} color={colors.labels.primary} />
                </TouchableOpacity>

                <View style={styles.patientInfo}>
                    <Avatar name={patientName || "Patient"} size={32} haveRing imageUrl={patientAvatar} color={patientData?.data?.doctor?.color || undefined} />
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

            {/* Composite Photo Generator (Hidden) */}
            {templateId && ghostItemsData.length > 0 && capturedPhotos.length > 0 && (
                <View style={styles.hiddenCompositeContainer}>
                    <CompositeLayout
                        ref={compositeViewRef}
                        ghostItems={ghostItemsData}
                        photos={capturedPhotos.map((photo) => ({
                            id: photo.id,
                            uri: photo.uri,
                            templateId: photo.templateId || "",
                        }))}
                        layoutPattern={layoutPattern}
                        containerWidth={width}
                        padding={5}
                        gap={5}
                        showDebugLabels={false}
                        onLayoutReady={() => {
                            setCompositeLayoutReady(true);
                        }}
                    />
                </View>
            )}

            {/* Main Image Carousel */}
            <View style={styles.carouselContainer}>
                {allPhotos.length > 0 ? (
                    <FlatList
                        ref={flatListRef}
                        data={allPhotos}
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
                        initialScrollIndex={currentIndex}
                        onScrollToIndexFailed={(info) => {
                            const wait = new Promise((resolve) => setTimeout(resolve, 500));
                            wait.then(() => {
                                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                            });
                        }}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <BaseText type="Body" color="labels.secondary">
                            No photos captured
                        </BaseText>
                    </View>
                )}

                {/* Retake button overlay - hide for composite */}
                {!currentPhoto?.isComposite && (
                    <View style={styles.retakeContainer}>
                        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                            <BaseText type="Subhead" color="labels.primary">
                                Retake
                            </BaseText>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Thumbnails */}
            <View style={styles.thumbnailsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsScroll}>
                    {allPhotos.map((photo, index) => (
                        <ThumbnailItem key={photo.id} photo={photo} index={index} isActive={index === currentIndex} onPress={handleThumbnailPress} />
                    ))}
                </ScrollView>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.footerButtons}>
                    <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} activeOpacity={0.8} disabled={isSaving || capturedPhotos.length === 0}>
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
                    <TouchableOpacity style={styles.testButton} onPress={() => setShowTestModal(true)} activeOpacity={0.8}>
                        <IconSymbol name="grid" size={18} color={colors.system.blue} />
                        <BaseText type="Body" weight={600} color="system.blue" style={{ marginLeft: 6 }}>
                            Test Layout
                        </BaseText>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Test Modal */}
            <CompositeLayoutTestModal visible={showTestModal} onClose={() => setShowTestModal(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
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
        height: height * 0.7,
        borderRadius: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
    thumbnailContainer: {
        borderRadius: 0, // Will be animated
        overflow: "hidden",
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
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    footer: {
        backgroundColor: colors.system.white,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    footerInfo: {
        alignItems: "center",
        marginBottom: 12,
    },
    saveButton: {
        flex: 1,
        backgroundColor: MINT_COLOR,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonDisabled: {
        backgroundColor: colors.system.gray3,
    },
    testButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.system.blue,
        backgroundColor: colors.system.white,
        shadowColor: colors.system.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    hiddenCompositeContainer: {
        position: "absolute",
        left: -width * 2, // Move off screen but keep it renderable
        top: 0,
        width: width,
        height: width, // 1:1 aspect ratio
        zIndex: -1,
    },
    compositeViewShot: {
        width: width,
        height: width, // 1:1 aspect ratio
        backgroundColor: colors.system.white,
    },
});
