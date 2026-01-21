import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useTempUpload, useUploadPatientMedia, useUploadPatientMediaWithTemplate } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import { useGetTemplateById } from "@/utils/hook/useTemplate";
import { CapturedPhoto } from "@/utils/types/camera.types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";
import { LayoutPattern } from "./_components/create-template/types";
import { getItemLayoutStyle } from "./_components/create-template/utils";

const { width, height } = Dimensions.get("window");
const MINT_COLOR = "#00c7be";

// Thumbnail component to avoid hooks in map
const ThumbnailItem: React.FC<{
    photo: CapturedPhoto;
    index: number;
    isActive: boolean;
    onPress: (index: number) => void;
}> = ({ photo, index, isActive, onPress }) => {
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
};

export default function ReviewScreen() {
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const { patientId, photos, templateId } = useLocalSearchParams<{
        patientId: string;
        photos: string;
        templateId?: string;
    }>();

    // Get patient data from API
    const { data: patientData, isLoading: isPatientLoading } = useGetPatientById(patientId || "");

    // Get template data from API
    const { data: templateData } = useGetTemplateById(templateId || "", !!templateId);

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
    type GhostItemData = {
        gostId: string;
        imageUrl?: string | null;
        rowIndex?: number;
        columnIndex?: number;
    };

    const ghostItemsData: GhostItemData[] = useMemo(() => {
        if (!templateData?.data) return [];

        const template = templateData.data as any;
        const items: GhostItemData[] = [];

        if (template.cells && Array.isArray(template.cells) && template.cells.length > 0) {
            const sortedCells = [...template.cells].sort((a: any, b: any) => {
                if (a.row_index !== b.row_index) return a.row_index - b.row_index;
                return a.column_index - b.column_index;
            });
            items.push(
                ...sortedCells.map((cell: any) => ({
                    gostId: String(cell.gost.id),
                    imageUrl: cell.gost.gost_image?.url || null,
                    rowIndex: cell.row_index,
                    columnIndex: cell.column_index,
                })),
            );
        } else if (template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0) {
            items.push(
                ...template.gosts.map((gost: any, index: number) => ({
                    gostId: String(gost.id),
                    imageUrl: gost.gost_image?.url || null,
                    rowIndex: Math.floor(index / 2), // Assume 2 columns
                    columnIndex: index % 2,
                })),
            );
        }

        return items;
    }, [templateData]);

    // Log captured photos to debug tempFilename issue
    React.useEffect(() => {
        console.log(
            "📋 [review] Captured photos received:",
            capturedPhotos.map((p) => ({
                id: p.id,
                tempFilename: p.tempFilename,
                uploadStatus: p.uploadStatus,
                templateId: p.templateId,
            })),
        );
    }, [capturedPhotos]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [compositePhoto, setCompositePhoto] = useState<CapturedPhoto | null>(null);
    const [isGeneratingComposite, setIsGeneratingComposite] = useState(false);
    const [compositeLayoutReady, setCompositeLayoutReady] = useState(false);
    
    // Debug: Log compositePhoto state changes
    React.useEffect(() => {
        console.log("🖼️ [Composite] State changed:", compositePhoto ? {
            id: compositePhoto.id,
            tempFilename: compositePhoto.tempFilename,
            uploadStatus: compositePhoto.uploadStatus,
            uri: compositePhoto.uri ? "exists" : "missing",
            isComposite: compositePhoto.isComposite,
        } : "null");
    }, [compositePhoto]);
    const compositeViewRef = useRef<ViewShot>(null);

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
                console.log("🖼️ [Composite] Template photos changed, resetting composite photo...");
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
            console.log("🖼️ [Composite] Starting composite generation...");
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
                console.error("🖼️ [Composite] ViewShot ref is null");
                setIsGeneratingComposite(false);
                return;
            }

            console.log("🖼️ [Composite] Capturing composite photo...");
            const uri = await captureRef(compositeViewRef.current, {
                format: "jpg",
                quality: 0.95,
                result: "tmpfile",
            });

            console.log("🖼️ [Composite] Composite photo generated:", uri);

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
            console.log("🖼️ [Composite] Composite photo added to list, state:", {
                id: newCompositePhoto.id,
                uri: newCompositePhoto.uri ? "exists" : "missing",
                uploadStatus: newCompositePhoto.uploadStatus,
                isComposite: newCompositePhoto.isComposite,
            });

            // Upload composite photo to temp-upload
            try {
                console.log("🖼️ [Composite] Starting upload to temp-upload endpoint...");
                console.log("🖼️ [Composite] File object:", {
                    uri: uri.substring(0, 50) + "...",
                    type: "image/jpeg",
                    name: `composite-${Date.now()}.jpg`,
                });
                // Prepare file object for React Native FormData
                const filename = `composite-${Date.now()}.jpg`;
                const file = {
                    uri: uri,
                    type: "image/jpeg",
                    name: filename,
                } as any;
                
                console.log("🖼️ [Composite] Calling tempUploadComposite mutation...");
                tempUploadComposite(file, {
                    onSuccess: (data) => {
                        console.log("🖼️ [Composite] ✅ tempUploadComposite onSuccess callback called!", data);
                    },
                    onError: (error) => {
                        console.error("🖼️ [Composite] ❌ tempUploadComposite onError callback called!", error);
                    },
                });
                console.log("🖼️ [Composite] tempUploadComposite mutation called (async)");
            } catch (error) {
                console.error("🖼️ [Composite] Error preparing composite photo for upload:", error);
                // Still allow saving without composite media field
                setCompositePhoto({
                    ...newCompositePhoto,
                    uploadStatus: "pending",
                });
            }

            setIsGeneratingComposite(false);
        } catch (error) {
            console.error("🖼️ [Composite] Error generating composite photo:", error);
            setIsGeneratingComposite(false);
        }
    };

    // Hook for temp upload (for composite photo)
    const { mutate: tempUploadComposite } = useTempUpload(
        (data) => {
            console.log("🖼️ [Composite] ✅✅✅ Temp upload SUCCESS callback triggered!");
            console.log("🖼️ [Composite] Response data:", JSON.stringify(data, null, 2));
            
            // Extract filename from TempUploadResponse
            const filename = data?.filename;
            console.log("🖼️ [Composite] Filename extracted:", filename);
            console.log("🖼️ [Composite] Data structure:", {
                hasData: !!data,
                hasFilename: !!data?.filename,
                fullData: data,
            });
            
            if (!filename) {
                console.error("🖼️ [Composite] ❌ No filename found in response!");
                return;
            }
            
            // Update composite photo with tempFilename using functional update
            setCompositePhoto((prev) => {
                console.log("🖼️ [Composite] Updating state, previous state:", prev ? {
                    id: prev.id,
                    tempFilename: prev.tempFilename,
                    uploadStatus: prev.uploadStatus,
                } : "null");
                
                if (prev) {
                    const updated = {
                        ...prev,
                        tempFilename: filename,
                        uploadStatus: "success" as const,
                    };
                    console.log("🖼️ [Composite] New state:", {
                        id: updated.id,
                        tempFilename: updated.tempFilename,
                        uploadStatus: updated.uploadStatus,
                    });
                    return updated;
                }
                console.warn("🖼️ [Composite] ⚠️ Previous state was null, cannot update!");
                return prev;
            });
        },
        (error) => {
            console.error("🖼️ [Composite] ❌❌❌ Temp upload ERROR callback triggered!");
            console.error("🖼️ [Composite] Error details:", error);
            console.error("🖼️ [Composite] Error message:", error?.message);
            console.error("🖼️ [Composite] Error stack:", error?.stack);
            
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
            console.error("Error uploading with template:", error);
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
            console.error("Error uploading media:", error);
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
        console.log("🖼️ [Composite] All photos count:", photos.length, "Composite:", !!compositePhoto, "Generating:", isGeneratingComposite, "Captured:", capturedPhotos.length);
        if (compositePhoto) {
            console.log("🖼️ [Composite] Composite in allPhotos:", {
                id: compositePhoto.id,
                tempFilename: compositePhoto.tempFilename,
                uploadStatus: compositePhoto.uploadStatus,
            });
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

    const handleThumbnailPress = (index: number) => {
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
    };

    const handleRetake = () => {
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
    };

    const handleSave = async () => {
        const photosToSave = capturedPhotos;

        if (photosToSave.length === 0) {
            Alert.alert("No Photos", "No photos to save.");
            return;
        }

        // Check if all photos have tempFilename
        const photosWithoutFilename = photosToSave.filter((p) => !p.tempFilename);
        if (photosWithoutFilename.length > 0) {
            console.log(
                "⚠️ [handleSave] Photos without tempFilename:",
                photosWithoutFilename.map((p) => ({ id: p.id, uploadStatus: p.uploadStatus })),
            );
            console.log(
                "⚠️ [handleSave] All capturedPhotos:",
                capturedPhotos.map((p) => ({ id: p.id, tempFilename: p.tempFilename, uploadStatus: p.uploadStatus })),
            );
            Alert.alert("Uploading...", "Some photos are still uploading. Please wait a moment and try again.");
            return;
        }

        // Check if composite photo is ready (for template uploads)
        const hasTemplate = templateId && photosToSave.some((p) => p.templateId !== "no-template");
        
        // Find composite photo from allPhotos (more reliable than state)
        const compositeFromAllPhotos = allPhotos.find((p) => p.isComposite);
        
        console.log("💾 [handleSave] Checking composite photo:", {
            hasTemplate,
            compositePhotoFromState: compositePhoto ? {
                id: compositePhoto.id,
                tempFilename: compositePhoto.tempFilename,
                uploadStatus: compositePhoto.uploadStatus,
                uri: compositePhoto.uri ? "exists" : "missing",
            } : null,
            compositePhotoFromAllPhotos: compositeFromAllPhotos ? {
                id: compositeFromAllPhotos.id,
                tempFilename: compositeFromAllPhotos.tempFilename,
                uploadStatus: compositeFromAllPhotos.uploadStatus,
                uri: compositeFromAllPhotos.uri ? "exists" : "missing",
            } : null,
            isGeneratingComposite,
        });
        
        // Use compositeFromAllPhotos if available, otherwise fall back to state
        const finalCompositePhoto = compositeFromAllPhotos || compositePhoto;
        
        if (hasTemplate && (!finalCompositePhoto || !finalCompositePhoto.tempFilename || finalCompositePhoto.uploadStatus !== "success")) {
            console.log("⚠️ [handleSave] Composite photo not ready:", {
                exists: !!finalCompositePhoto,
                hasTempFilename: !!finalCompositePhoto?.tempFilename,
                uploadStatus: finalCompositePhoto?.uploadStatus,
            });
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
                const requestData: any = {
                    template_id: templateIdNum,
                    type: "image",
                    data: JSON.stringify({}),
                    images: images,
                };

                // Add composite photo media if available (required for template uploads)
                if (finalCompositePhoto?.tempFilename) {
                    requestData.media = finalCompositePhoto.tempFilename;
                    console.log("📤 [handleSave] Adding composite photo media (tempFilename):", finalCompositePhoto.tempFilename);
                } else {
                    console.error("⚠️ [handleSave] Composite photo tempFilename is missing! Cannot proceed without media field.");
                    Alert.alert("Error", "Composite image is not ready yet. Please wait.");
                    setIsSaving(false);
                    return;
                }

                // Log final request data before sending
                console.log("📤 [handleSave] ========== FINAL REQUEST DATA TO BACKEND ==========");
                console.log("📤 [handleSave] Patient ID:", patientId);
                console.log("📤 [handleSave] Template ID:", requestData.template_id);
                console.log("📤 [handleSave] Type:", requestData.type);
                console.log("📤 [handleSave] Media (composite tempFilename):", requestData.media);
                console.log("📤 [handleSave] Data:", requestData.data);
                console.log("📤 [handleSave] Images count:", requestData.images.length);
                console.log("📤 [handleSave] Images details:");
                requestData.images.forEach((img: any, idx: number) => {
                    console.log(`📤 [handleSave]   Image ${idx + 1}:`, {
                        gost_id: img.gost_id,
                        media: img.media,
                        notes: img.notes,
                    });
                });
                console.log("📤 [handleSave] ==================================================");

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

                console.log("📤 [handleSave] ========== UPLOAD WITHOUT TEMPLATE ==========");
                console.log("📤 [handleSave] Patient ID:", patientId);
                console.log("📤 [handleSave] Total photos to upload:", photosWithoutTemplate.length);

                photosWithoutTemplate.forEach((photo, index) => {
                    // Use tempFilename from temp-upload, fallback to error if not available
                    if (!photo.tempFilename) {
                        console.error(`📤 [handleSave] Photo ${index + 1} does not have tempFilename. Please wait for upload to complete.`);
                        Alert.alert("Error", `Photo ${index + 1} is still uploading. Please wait.`);
                        setIsSaving(false);
                        return;
                    }

                    const requestData = {
                        media: photo.tempFilename, // Send only filename string, not file object
                        type: "image",
                        data: {},
                    };

                    // Log the data model before sending
                    console.log(`📤 [handleSave] Photo ${index + 1}/${photosWithoutTemplate.length}:`);
                    console.log("📤 [handleSave]   - Photo URI:", photo.uri);
                    console.log("📤 [handleSave]   - Photo ID:", photo.id);
                    console.log("📤 [handleSave]   - Photo Timestamp:", photo.timestamp);
                    console.log("📤 [handleSave]   - Temp Filename:", photo.tempFilename);
                    console.log("📤 [handleSave]   - Request Data:", JSON.stringify(requestData, null, 2));

                    // Call API
                    uploadMedia({
                        patientId,
                        data: requestData,
                    });
                });

                console.log("📤 [handleSave] ===========================================");
            }
        } catch (error) {
            console.error("Error saving photos:", error);
            Alert.alert("Error", "Failed to save photos. Please try again.");
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
    };

    const handleScroll = (event: any) => {
        // Don't update index if we're programmatically scrolling
        if (isScrolling) return;

        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex && index >= 0 && index < allPhotos.length) {
            setCurrentIndex(index);
        }
    };

    const renderMainImage = ({ item, index }: { item: CapturedPhoto; index: number }) => {
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
    };

    // Helper function to get layout style with 3:2 aspect ratio
    // Uses the same logic as PreviewCanvas but scaled to 3:2 ratio with 12px padding
    const getCompositeLayoutStyle = (index: number, total: number, layoutPattern: LayoutPattern) => {
        // PreviewCanvas uses: width - 40, height: (width - 40) * 0.92
        // We want: width - 24 (12px padding each side), height: width * (3/2) - 24 (12px padding top/bottom)
        const padding = 12;
        const previewBoxWidth = width - 40;
        const previewBoxHeight = previewBoxWidth * 0.92;
        const compositeBoxWidth = width - padding * 2; // Account for padding
        const compositeBoxHeight = width * (3 / 2) - padding * 2; // Account for padding
        
        // Get base layout style using PreviewCanvas dimensions (same as PreviewCanvas)
        const baseStyle = getItemLayoutStyle(index, total, layoutPattern);
        
        // Calculate scale factors
        const scaleX = compositeBoxWidth / previewBoxWidth;
        const scaleY = compositeBoxHeight / previewBoxHeight;
        
        console.log(`🖼️ [Composite] Layout calculation for index ${index}/${total}:`, {
            previewBoxWidth,
            previewBoxHeight,
            compositeBoxWidth,
            compositeBoxHeight,
            scaleX: scaleX.toFixed(3),
            scaleY: scaleY.toFixed(3),
            baseStyle,
        });
        
        // Scale all positions and sizes, then add padding offset
        const scaledStyle: any = {
            position: baseStyle.position || "absolute",
        };
        
        if (baseStyle.left !== undefined) {
            scaledStyle.left = padding + baseStyle.left * scaleX;
        }
        if (baseStyle.right !== undefined) {
            scaledStyle.right = padding + baseStyle.right * scaleX;
        }
        if (baseStyle.top !== undefined) {
            scaledStyle.top = padding + baseStyle.top * scaleY;
        }
        if (baseStyle.bottom !== undefined) {
            scaledStyle.bottom = padding + baseStyle.bottom * scaleY;
        }
        if (baseStyle.width !== undefined) {
            scaledStyle.width = baseStyle.width * scaleX;
        }
        if (baseStyle.height !== undefined) {
            scaledStyle.height = baseStyle.height * scaleY;
        }
        
        console.log(`🖼️ [Composite] Scaled style for index ${index}:`, scaledStyle);
        
        return scaledStyle;
    };

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
                    <ViewShot
                        ref={compositeViewRef}
                        style={styles.compositeViewShot}
                        options={{ format: "jpg", quality: 0.95 }}
                        onLayout={() => {
                            console.log("🖼️ [Composite] Layout ready");
                            setCompositeLayoutReady(true);
                        }}
                    >
                        <View style={styles.compositeContainer}>
                            {(() => {
                                // Filter to only include ghost items that have photos
                                const itemsWithPhotos = ghostItemsData
                                    .map((ghostItem) => {
                                        const photo = capturedPhotos.find((p) => p.templateId === ghostItem.gostId);
                                        return photo ? { ghostItem, photo } : null;
                                    })
                                    .filter((item): item is { ghostItem: GhostItemData; photo: CapturedPhoto } => item !== null);

                                // Get layout pattern from template data
                                const template = templateData?.data as any;
                                const layoutPattern: LayoutPattern = template?.layout_pattern || "grid-2x2";

                                console.log(`🖼️ [Composite] Rendering ${itemsWithPhotos.length} images with layout pattern: ${layoutPattern}`);

                                return itemsWithPhotos.map(({ ghostItem, photo }, index) => {
                                    // Use helper function to get layout style with 3:2 aspect ratio
                                    // Index is based on filtered array (only items with photos)
                                    const layoutStyle = getCompositeLayoutStyle(index, itemsWithPhotos.length, layoutPattern);

                                    console.log(`🖼️ [Composite] Image ${index + 1}/${itemsWithPhotos.length}:`, {
                                        gostId: ghostItem.gostId,
                                        layoutStyle,
                                    });

                                    return (
                                        <View
                                            key={ghostItem.gostId}
                                            style={[
                                                styles.compositeCell,
                                                layoutStyle,
                                            ]}
                                        >
                                            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
                                        </View>
                                    );
                                });
                            })()}
                        </View>
                    </ViewShot>
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
                        <ThumbnailItem
                            key={photo.id}
                            photo={photo}
                            index={index}
                            isActive={index === currentIndex}
                            onPress={handleThumbnailPress}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
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
            </View>
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
    hiddenCompositeContainer: {
        position: "absolute",
        left: -width * 2, // Move off screen but keep it renderable
        top: 0,
        width: width,
        height: width * (3 / 2), // 3:2 aspect ratio
        zIndex: -1,
    },
    compositeViewShot: {
        width: width,
        height: width * (3 / 2), // 3:2 aspect ratio
        backgroundColor: colors.system.white,
    },
    compositeContainer: {
        width: width,
        height: width * (3 / 2), // 3:2 aspect ratio
        backgroundColor: colors.system.white,
        position: "relative",
        padding: 12, // 12px padding from all sides
    },
    compositeCell: {
        position: "absolute",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: colors.system.white,
    },
});
