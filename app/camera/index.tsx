import { GHOST_ASSETS, type GhostItemId } from "@/assets/gost/ghostAssets";
import { getGhostDescription, getGhostIcon, getGhostName, getGhostSample } from "@/assets/gost/ghostMetadata";
import { BaseButton, BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useTempUpload } from "@/utils/hook/useMedia";
import { useGetPatientById } from "@/utils/hook/usePatient";
import { useGetTemplateById } from "@/utils/hook/useTemplate";
import { CameraState, CapturedPhoto, FlashMode } from "@/utils/types/camera.types";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const THUMBNAIL_SIZE = 48;
const MINT_COLOR = "#00c7be";

// 3:2 Aspect Ratio Constant
const ASPECT_RATIO = 3 / 2; // 1.5 - Portrait mode (height = width * 1.5)

const FLASH_OPTIONS: { mode: FlashMode; icon: string; label: string }[] = [
    { mode: "auto", icon: "bolt.badge.automatic", label: "Auto" },
    { mode: "on", icon: "bolt.fill", label: "On" },
    { mode: "off", icon: "bolt.slash", label: "Off" },
];

const GHOST_ITEMS_MAP = GHOST_ASSETS;

export default function CameraScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    const {
        patientId,
        templateId,
        retakeTemplateId,
        capturedPhotos: capturedPhotosParam,
    } = useLocalSearchParams<{
        patientId: string;
        templateId?: string;
        retakeTemplateId?: string;
        capturedPhotos?: string;
    }>();

    // Get patient data from API
    const { data: patientData, isLoading: isPatientLoading } = useGetPatientById(patientId || "");

    // Get template data from API
    const { data: templateData, isLoading: isTemplateLoading } = useGetTemplateById(templateId || "", !!templateId);

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

    const doctorColor = useMemo(() => {
        return patientData?.data?.doctor?.color || undefined;
    }, [patientData]);

    // Extract ghost items from template
    const ghostItemsData: GhostItemData[] = useMemo(() => {
        if (!templateData?.data) return [];

        const template = templateData.data as any; // Use any to access both cells and gosts
        const items: GhostItemData[] = [];

        // Prefer cells over gosts (new format)
        if (template.cells && Array.isArray(template.cells) && template.cells.length > 0) {
            // Sort by row_index and column_index to maintain order
            const sortedCells = [...template.cells].sort((a: any, b: any) => {
                if (a.row_index !== b.row_index) return a.row_index - b.row_index;
                return a.column_index - b.column_index;
            });
            items.push(
                ...sortedCells.map((cell: any) => ({
                    gostId: String(cell.gost.id),
                    imageUrl: cell.gost.gost_image?.url || null,
                    sampleImageUrl: cell.gost.image?.url || null,
                    iconUrl: cell.gost.icon?.url || null,
                    name: cell.gost.name,
                    description: cell.gost.description || null,
                })),
            );
        } else if (template.gosts && Array.isArray(template.gosts) && template.gosts.length > 0) {
            // Fallback to gosts array (backward compatibility)
            items.push(
                ...template.gosts.map((gost: any) => ({
                    gostId: String(gost.id),
                    imageUrl: gost.gost_image?.url || null,
                    sampleImageUrl: gost.image?.url || null,
                    iconUrl: gost.icon?.url || null,
                    name: gost.name,
                    description: gost.description || null,
                })),
            );
        }

        return items;
    }, [templateData]);

    type GhostItemData = {
        gostId: string;
        imageUrl?: string | null; // gost_image.url - for overlay center
        sampleImageUrl?: string | null; // image.url - for sample modal
        iconUrl?: string | null; // icon.url - for thumbnails
        name?: string;
        description?: string | null;
    };

    const isGhostItemId = (value: unknown): value is GhostItemId => typeof value === "string" && Object.prototype.hasOwnProperty.call(GHOST_ASSETS, value);

    // Extract just IDs for backward compatibility (only for local assets)
    const ghostItemIds: GhostItemId[] = React.useMemo(() => {
        return ghostItemsData.map((item) => item.gostId).filter(isGhostItemId);
    }, [ghostItemsData]);

    // Use ghostItemsData for all items (both local and API)
    const hasGhostItems = ghostItemsData.length > 0;

    const [cameraState, setCameraState] = useState<CameraState>({
        flashMode: "auto",
        cameraPosition: "back",
        isGridEnabled: true,
        zoomLevel: 0,
    });

    const [isCapturing, setIsCapturing] = useState(false);
    // Initialize capturedPhotos from params if coming from retake, otherwise empty
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(() => {
        if (capturedPhotosParam) {
            try {
                return JSON.parse(capturedPhotosParam);
            } catch {
                return [];
            }
        }
        return [];
    });
    const [currentGhostIndex, setCurrentGhostIndex] = useState(0);
    const currentGhostIndexRef = useRef(currentGhostIndex);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showSampleModal, setShowSampleModal] = useState(false);

    // Ref to track which photo is being uploaded (photoId -> upload promise)
    const uploadingPhotoIdRef = useRef<string | null>(null);
    // Ref to track tempFilename synchronously (photoId -> tempFilename)
    const tempFilenameMapRef = useRef<Map<string, string>>(new Map());

    // Hook for immediate temp upload (for all photos)
    const { mutate: uploadToTemp } = useTempUpload(
        (response) => {
            // Response structure: {success: true, data: {filename: '...'}}
            const responseAny = response as any;
            const tempFilename = responseAny?.data?.filename || responseAny?.filename || responseAny?.id?.toString();

            console.log("📥 [tempUpload] Response received:", response);
            console.log("📥 [tempUpload] Extracted filename:", tempFilename);

            if (tempFilename && uploadingPhotoIdRef.current) {
                const photoId = uploadingPhotoIdRef.current;

                // Update ref immediately (synchronous)
                tempFilenameMapRef.current.set(photoId, tempFilename);
                console.log(`✅ [tempUpload] Updated photo ${photoId} with filename: ${tempFilename} (ref updated)`);

                // Update state (async)
                setCapturedPhotos((prev) => {
                    return prev.map((p) => {
                        if (p.id === photoId && !p.tempFilename) {
                            return { ...p, tempFilename, uploadStatus: "success" as const };
                        }
                        return p;
                    });
                });
                uploadingPhotoIdRef.current = null; // Reset
            } else {
                console.warn("⚠️ [tempUpload] No tempFilename or photoId found", { tempFilename, photoId: uploadingPhotoIdRef.current });
            }
        },
        (error) => {
            console.error("❌ [tempUpload] Error uploading photo to temp:", error);
            // Update upload status to error
            if (uploadingPhotoIdRef.current) {
                const photoId = uploadingPhotoIdRef.current;
                setCapturedPhotos((prev) => {
                    return prev.map((p) => {
                        if (p.id === photoId && p.uploadStatus === "uploading") {
                            return { ...p, uploadStatus: "error" as const };
                        }
                        return p;
                    });
                });
                uploadingPhotoIdRef.current = null; // Reset
            }
        },
    );

    // Keep ref in sync with state
    useEffect(() => {
        currentGhostIndexRef.current = currentGhostIndex;
    }, [currentGhostIndex]);

    // Navigate to specific ghost item when retaking a photo
    // Note: The photo is already removed in review.tsx before navigation, so we just need to navigate
    // Also handle case when retaking a photo without template (no-template)
    useEffect(() => {
        if (retakeTemplateId) {
            // If retaking a photo without template, remove it from capturedPhotos
            if (retakeTemplateId === "no-template") {
                setCapturedPhotos((prev) => prev.filter((p) => p.templateId !== "no-template"));
            } else if (ghostItemsData.length > 0) {
                // If retaking a photo with template, navigate to that ghost item
                const retakeIndex = ghostItemsData.findIndex((item) => item.gostId === retakeTemplateId);
                if (retakeIndex !== -1) {
                    setCurrentGhostIndex(retakeIndex);
                }
            }
        }
    }, [retakeTemplateId, ghostItemsData]);

    // Show guide modal when ghost items are available
    useEffect(() => {
        if (hasGhostItems) {
            setShowGuideModal(true);
        }
    }, [hasGhostItems]);

    // Animation values
    const flashAnim = useSharedValue(0);
    const checkmarkScale = useSharedValue(0);

    // Current ghost item - use ghostItemsData for all items
    const currentGhostData = hasGhostItems ? ghostItemsData[currentGhostIndex] : null;
    const currentGhostItem = currentGhostData ? (isGhostItemId(currentGhostData.gostId) ? currentGhostData.gostId : null) : null;
    // Use imageUrl from API if available, otherwise fallback to local assets
    const currentGhostImage = currentGhostData?.imageUrl ? { uri: currentGhostData.imageUrl } : currentGhostItem ? GHOST_ITEMS_MAP[currentGhostItem] : null;
    const isLastGhost = currentGhostIndex === ghostItemsData.length - 1;
    const allPhotosCaptures = capturedPhotos.length === ghostItemsData.length && hasGhostItems;

    // Check if current ghost has a captured photo
    // IMPORTANT: Use the EXACT same logic as when taking photo to find the photo
    // When taking photo: templateId = currentGhostData?.gostId || currentGhostItem || "no-template"
    const currentGhostIdForPhoto = currentGhostData?.gostId || currentGhostItem || "no-template";
    const currentGhostPhoto = useMemo(() => {
        // Find photo using the same templateId logic used when taking the photo
        const photo = capturedPhotos.find((p) => {
            // Match by templateId (which was set to ghostId when photo was taken)
            return p.templateId === currentGhostIdForPhoto;
        });
        return photo || null;
    }, [currentGhostIdForPhoto, capturedPhotos]);
    const hasCurrentPhoto = !!currentGhostPhoto;

    // Get template metadata - use data from gost object if available, fallback to metadata
    const getTemplateName = () => {
        if (currentGhostData?.name) return currentGhostData.name;
        if (!currentGhostItem) return "Template";
        return getGhostName(currentGhostItem);
    };

    const getTemplateDescription = () => {
        if (currentGhostData?.description) return currentGhostData.description;
        if (!currentGhostItem) return "Follow the guide lines to position correctly.";
        return getGhostDescription(currentGhostItem);
    };

    const handleCloseGuide = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowGuideModal(false);
    };

    const handleShowSample = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSampleModal(true);
    };

    const handleCloseSample = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSampleModal(false);
    };

    // Simple toggle functions
    const toggleFlash = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const modes: FlashMode[] = ["auto", "on", "off"];
        const currentIndex = modes.indexOf(cameraState.flashMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setCameraState((prev) => ({ ...prev, flashMode: modes[nextIndex] }));
    };

    const toggleGrid = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCameraState((prev) => ({ ...prev, isGridEnabled: !prev.isGridEnabled }));
    };

    const toggleCamera = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCameraState((prev) => ({
            ...prev,
            cameraPosition: prev.cameraPosition === "back" ? "front" : "back",
        }));
    };

    const handleSelectTemplate = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: "/camera/template-select" as any,
            params: { patientId },
        });
    };

    const handleGoToReview = useCallback(
        (photos: CapturedPhoto[]) => {
            // Log photos before sending to review
            console.log(
                "📤 [handleGoToReview] Sending photos to review:",
                photos.map((p) => ({
                    id: p.id,
                    tempFilename: p.tempFilename,
                    uploadStatus: p.uploadStatus,
                    templateId: p.templateId,
                })),
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
                pathname: "/camera/review" as any,
                params: {
                    patientId,
                    photos: JSON.stringify(photos),
                    ...(templateId && { templateId }),
                },
            });
        },
        [patientId, templateId],
    );

    // Handle retake - remove photo for current ghost and allow retaking
    const handleRetake = useCallback(() => {
        if (!currentGhostData) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Use the same logic as when taking photo to find and remove the photo
        const ghostId = currentGhostData?.gostId || currentGhostItem || "no-template";

        setCapturedPhotos((prev) => {
            return prev.filter((p) => p.templateId !== ghostId);
        });
    }, [currentGhostData, currentGhostItem]);

    // Take photo
    const handleTakePhoto = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        flashAnim.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 150 }));

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.9,
                skipProcessing: false,
            });

            if (photo) {
                // Crop photo to 3:2 aspect ratio (what user sees is what they get)
                const originalWidth = photo.width;
                const originalHeight = photo.height;
                const targetRatio = ASPECT_RATIO; // 3:2 = 1.5

                let cropWidth: number;
                let cropHeight: number;
                let cropX: number;
                let cropY: number;

                const currentRatio = originalHeight / originalWidth;

                if (currentRatio > targetRatio) {
                    // Image is taller than 3:2, crop top and bottom
                    cropWidth = originalWidth;
                    cropHeight = Math.round(originalWidth * targetRatio);
                    cropX = 0;
                    cropY = Math.round((originalHeight - cropHeight) / 2);
                } else {
                    // Image is wider than 3:2, crop left and right
                    cropHeight = originalHeight;
                    cropWidth = Math.round(originalHeight / targetRatio);
                    cropX = Math.round((originalWidth - cropWidth) / 2);
                    cropY = 0;
                }

                // Crop the image to 3:2 ratio
                const croppedPhoto = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [
                        {
                            crop: {
                                originX: cropX,
                                originY: cropY,
                                width: cropWidth,
                                height: cropHeight,
                            },
                        },
                    ],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );

                console.log(`📷 [Camera] Cropped from ${originalWidth}x${originalHeight} to ${cropWidth}x${cropHeight} (3:2 ratio)`);

                const finalPhotoUri = croppedPhoto.uri;

                const ghostId = currentGhostData?.gostId || currentGhostItem || "no-template";
                const ghostName = currentGhostData?.name || currentGhostItem || "Quick Photo";
                const photoTimestamp = Date.now();
                const newPhoto: CapturedPhoto = {
                    id: `photo-${photoTimestamp}`,
                    uri: finalPhotoUri,
                    templateId: ghostId,
                    templateName: ghostName,
                    timestamp: photoTimestamp,
                    isCompleted: true,
                    uploadStatus: "pending",
                };

                setCapturedPhotos((prev) => {
                    // Replace if exists for this ghost item (using gostId)
                    const existing = prev.findIndex((p) => p.templateId === ghostId);
                    if (existing !== -1) {
                        const updated = [...prev];
                        updated[existing] = newPhoto;
                        return updated;
                    }
                    return [...prev, newPhoto];
                });

                // Immediately upload ALL photos to temp-upload service
                try {
                    const filename = finalPhotoUri.split("/").pop() || "image.jpg";
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : "image/jpeg";

                    const file = {
                        uri: finalPhotoUri,
                        type: type,
                        name: filename,
                    } as any;

                    // Update status to uploading and set ref to track this photo
                    uploadingPhotoIdRef.current = newPhoto.id;
                    setCapturedPhotos((prev) => prev.map((p) => (p.id === newPhoto.id ? { ...p, uploadStatus: "uploading" } : p)));

                    console.log(`📤 [tempUpload] Uploading photo ${newPhoto.id} to temp-upload...`);

                    // Upload immediately to temp-upload
                    uploadToTemp(file);
                } catch (error) {
                    console.error("Error preparing photo for temp upload:", error);
                    setCapturedPhotos((prev) => prev.map((p) => (p.id === newPhoto.id ? { ...p, uploadStatus: "error" } : p)));
                    uploadingPhotoIdRef.current = null; // Reset on error
                }

                if (hasGhostItems) {
                    // Show checkmark animation only when using templates - smoother, less bounce
                    checkmarkScale.value = withSequence(
                        withTiming(1, { duration: 200 }), // Fade in smoothly
                        withTiming(0, { duration: 300 }), // Fade out smoothly
                    );

                    // Wait for animation to complete, then move to next ghost (don't auto-navigate to review)
                    setTimeout(() => {
                        const currentIndex = currentGhostIndexRef.current;
                        if (currentIndex < ghostItemsData.length - 1) {
                            // Move to next ghost
                            setCurrentGhostIndex((prev) => prev + 1);
                        }
                        // Don't auto-navigate to review - user must click Save button
                    }, 500);
                }
                // No template - don't auto-navigate, user must click Save button
            }
        } catch (error) {
            console.error("Error taking photo:", error);
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, currentGhostData, currentGhostItem, hasGhostItems, ghostItemsData.length, handleGoToReview]);

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const getFlashIcon = () => {
        const option = FLASH_OPTIONS.find((o) => o.mode === cameraState.flashMode);
        return option?.icon || "bolt.badge.automatic";
    };

    // Animated styles
    const flashOverlayStyle = useAnimatedStyle(() => ({
        opacity: flashAnim.value,
    }));

    const checkmarkAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkmarkScale.value }],
        opacity: checkmarkScale.value > 0 ? 1 : 0, // Show/hide based on scale
    }));

    // Loading state - wait for patient and template data
    if (isPatientLoading || (templateId && isTemplateLoading)) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black, justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={colors.system.white} />
            </View>
        );
    }

    // Error state - if patient not found
    if (!patientData?.data) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black, justifyContent: "center", alignItems: "center" }]}>
                <BaseText color="labels.primary">Patient not found</BaseText>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 12, backgroundColor: colors.system.blue, borderRadius: 8 }}>
                    <BaseText color="system.white">Go Back</BaseText>
                </TouchableOpacity>
            </View>
        );
    }

    // Permission handling
    if (!permission) {
        return (
            <View style={[styles.container, { backgroundColor: colors.system.black }]}>
                <BaseText color="labels.primary">Loading...</BaseText>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permissionContainer]}>
                <IconSymbol name="camera" size={64} color={colors.system.white} />
                <BaseText type="Title2" color="labels.primary" className="mt-4 text-center">
                    Camera Access Required
                </BaseText>
                <BaseText type="Body" color="labels.secondary" className="mt-2 text-center px-8">
                    Please allow camera access to take photos
                </BaseText>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
                    <BaseText type="Body" weight={600} color="system.white">
                        Grant Permission
                    </BaseText>
                </TouchableOpacity>
            </View>
        );
    }

    // Calculate 3:2 viewport dimensions that fit within available space
    const headerHeight = insets.top + 64; // Header: insets.top + 8 (paddingTop) + 44 (button height) + 12 (paddingBottom)
    const bottomHeight = (hasGhostItems ? 172 : 108) + insets.bottom;
    const availableHeight = SCREEN_HEIGHT - headerHeight - bottomHeight;
    
    // 3:2 viewport - fit within available space while maintaining ratio
    // Calculate max viewport that fits: either full width with calculated height, or full height with calculated width
    const maxViewportHeightByWidth = SCREEN_WIDTH * ASPECT_RATIO; // Height if we use full width
    const maxViewportWidthByHeight = availableHeight / ASPECT_RATIO; // Width if we use full height
    
    let viewportWidth: number;
    let viewportHeight: number;
    
    if (maxViewportHeightByWidth <= availableHeight) {
        // Full width fits, use it
        viewportWidth = SCREEN_WIDTH;
        viewportHeight = maxViewportHeightByWidth;
    } else {
        // Need to scale down to fit available height
        viewportHeight = availableHeight;
        viewportWidth = maxViewportWidthByHeight;
    }
    
    // Center the viewport
    const viewportTop = headerHeight + (availableHeight - viewportHeight) / 2;
    const viewportLeft = (SCREEN_WIDTH - viewportWidth) / 2;
    const viewportBottom = SCREEN_HEIGHT - viewportTop - viewportHeight;

    return (
        <View style={styles.container}>
            {/* Camera View - Full screen behind everything */}
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraState.cameraPosition} flash={cameraState.flashMode} zoom={0} />

            {/* Top Mask - Covers area above viewport */}
            <View style={[styles.viewportMask, { top: 0, left: 0, right: 0, height: viewportTop }]} />

            {/* Bottom Mask - Covers area below viewport */}
            <View style={[styles.viewportMask, { bottom: 0, left: 0, right: 0, height: viewportBottom }]} />

            {/* Left Mask - Covers area to the left of viewport (when viewport is narrower than screen) */}
            {viewportLeft > 0 && (
                <View style={[styles.viewportMask, { top: viewportTop, left: 0, width: viewportLeft, height: viewportHeight }]} />
            )}

            {/* Right Mask - Covers area to the right of viewport (when viewport is narrower than screen) */}
            {viewportLeft > 0 && (
                <View style={[styles.viewportMask, { top: viewportTop, right: 0, width: viewportLeft, height: viewportHeight }]} />
            )}

            {/* 3:2 Viewport Container */}
            <View
                style={[
                    styles.viewportContainer,
                    {
                        top: viewportTop,
                        left: viewportLeft,
                        width: viewportWidth,
                        height: viewportHeight,
                    },
                ]}
                pointerEvents="box-none"
            >
                {/* Show captured photo if exists, otherwise show grid and ghost overlay */}
                {hasCurrentPhoto && currentGhostPhoto ? (
                    /* Captured Photo Overlay - Show the taken photo */
                    <View style={[styles.capturedPhotoOverlay, { backgroundColor: colors.system.black }]}>
                        <Image source={{ uri: currentGhostPhoto.uri }} style={styles.capturedPhotoImage} contentFit="contain" />
                    </View>
                ) : (
                    <>
                        {/* Development Overlay - Border to show 3:2 capture area */}
                        {__DEV__ && (
                            <View
                                style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: "rgba(0,199,190,0.8)", borderStyle: "dashed" }]}
                                pointerEvents="none"
                            />
                        )}

                        {/* Grid Overlay */}
                        {cameraState.isGridEnabled && (
                            <View style={[styles.gridContainer, StyleSheet.absoluteFill]}>
                                <View style={[styles.gridLine, styles.gridVertical, { left: "33.33%" }]} />
                                <View style={[styles.gridLine, styles.gridVertical, { left: "66.66%" }]} />
                                <View style={[styles.gridLine, styles.gridHorizontal, { top: "33.33%" }]} />
                                <View style={[styles.gridLine, styles.gridHorizontal, { top: "66.66%" }]} />
                            </View>
                        )}

                        {/* Ghost Overlay */}
                        {currentGhostImage && (
                            <View style={[styles.ghostOverlay, StyleSheet.absoluteFill]}>
                                <Image source={currentGhostImage} style={styles.ghostImage} contentFit="contain" />
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Sample/Retake Button and Camera Controls - Absolute positioned above thumbnails */}
            {hasGhostItems && (
                <View style={{ position: "absolute", bottom: 195 + insets.bottom, left: 0, right: 0, alignItems: "center", justifyContent: "center", pointerEvents: "box-none", zIndex: 10 }}>
                    {/* If photo is captured, only show Retake button */}
                    {hasCurrentPhoto ? (
                        <BaseButton ButtonStyle="Gray" onPress={handleRetake} label="Retake" />
                    ) : (
                        <View style={styles.bottomControlsRow}>
                            {/* Grid Control */}
                            <TouchableOpacity style={styles.bottomControlButton} onPress={toggleGrid} activeOpacity={0.7}>
                                <View style={styles.bottomControlButtonBg}>
                                    <IconSymbol name="grid" size={22} color={cameraState.isGridEnabled ? colors.system.yellow : colors.system.white} />
                                </View>
                            </TouchableOpacity>

                            {/* Sample Button */}
                            <BaseButton ButtonStyle="Gray" onPress={handleShowSample} label="Sample" />

                            {/* Flash Control */}
                            <TouchableOpacity style={styles.bottomControlButton} onPress={toggleFlash} activeOpacity={0.7}>
                                <View style={styles.bottomControlButtonBg}>
                                    <IconSymbol name={getFlashIcon() as any} size={22} color={colors.system.white} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
                    <View style={styles.closeButtonBg}>
                        <IconSymbol name="chevron.left" size={24} color={colors.system.white} />
                    </View>
                </TouchableOpacity>

                <View style={styles.patientInfo}>
                    <Avatar name={patientName || "Patient"} size={32} haveRing imageUrl={patientAvatar} color={doctorColor as string} />
                    <View style={styles.patientTextContainer}>
                        <BaseText type="Subhead" weight={600} color="system.white">
                            {patientName || "Patient Name"}
                        </BaseText>
                        <BaseText type="Caption1" color="system.white" style={{ opacity: 0.8 }}>
                            {doctorName || "Dr. Name"}
                        </BaseText>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    {/* Save Button - Only enable when conditions are met */}
                    {(() => {
                        // Check if any photo is currently uploading
                        const isUploading = capturedPhotos.some((p) => p.uploadStatus === "uploading");

                        // Check if save button should be enabled
                        let canSave = false;

                        if (!hasGhostItems) {
                            // No template: need at least one photo uploaded
                            const noTemplatePhotos = capturedPhotos.filter((p) => p.templateId === "no-template");
                            canSave =
                                noTemplatePhotos.length > 0 &&
                                noTemplatePhotos.every((p) => {
                                    // Check state first, then ref
                                    return p.tempFilename || tempFilenameMapRef.current.has(p.id);
                                });
                        } else {
                            // With template: need all photos captured and uploaded
                            const allCaptured = capturedPhotos.length === ghostItemsData.length;
                            const allUploaded = capturedPhotos.every((p) => {
                                // Check state first, then ref
                                return p.tempFilename || tempFilenameMapRef.current.has(p.id);
                            });
                            canSave = allCaptured && allUploaded;
                        }

                        const isDisabled = !canSave || isUploading;

                        return (
                            <TouchableOpacity
                                style={[styles.saveButtonHeader, isDisabled && styles.saveButtonHeaderDisabled]}
                                onPress={() => {
                                    if (canSave && !isUploading) {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        // Merge tempFilename from ref into photos before going to review
                                        const finalPhotos = capturedPhotos.map((p) => {
                                            const tempFilenameFromRef = tempFilenameMapRef.current.get(p.id);
                                            if (tempFilenameFromRef && !p.tempFilename) {
                                                return { ...p, tempFilename: tempFilenameFromRef, uploadStatus: "success" as const };
                                            }
                                            return p;
                                        });
                                        handleGoToReview(finalPhotos);
                                    }
                                }}
                                disabled={isDisabled}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color={colors.system.gray} />
                                ) : (
                                    <BaseText type="Body" weight={400} color={canSave ? "system.black" : "system.gray"}>
                                        Save
                                    </BaseText>
                                )}
                            </TouchableOpacity>
                        );
                    })()}
                </View>
            </View>

            {/* Template Badge - shows current ghost name */}
            {/* {hasGhostItems && (
                <View style={styles.templateBadge}>
                    <BaseText type="Caption1" weight={600} color="system.white">
                        {currentGhostData?.name || currentGhostItem || "Template"} ({currentGhostIndex + 1}/{ghostItemsData.length})
                    </BaseText>
                </View>
            )} */}

            {/* Template Select Button and Camera Controls - Only show when no ghost items selected */}
            {!hasGhostItems && (
                <View style={styles.templateButtonContainer}>
                    {/* If photo is captured, only show Retake button */}
                    {hasCurrentPhoto ? (
                        <BaseButton
                            ButtonStyle="Gray"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setCapturedPhotos((prev) => prev.filter((p) => p.templateId !== "no-template"));
                            }}
                            label="Retake"
                        />
                    ) : (
                        <View style={styles.bottomControlsRow}>
                            {/* Grid Control */}
                            <TouchableOpacity style={styles.bottomControlButton} onPress={toggleGrid} activeOpacity={0.7}>
                                <View style={styles.bottomControlButtonBg}>
                                    <IconSymbol name="grid" size={22} color={cameraState.isGridEnabled ? colors.system.yellow : colors.system.white} />
                                </View>
                            </TouchableOpacity>

                            {/* Template Select Button */}
                            <TouchableOpacity style={styles.templateButton} onPress={handleSelectTemplate} activeOpacity={0.8}>
                                <BaseText type="Body" weight={600} color="system.white">
                                    Select a template
                                </BaseText>
                            </TouchableOpacity>

                            {/* Flash Control */}
                            <TouchableOpacity style={styles.bottomControlButton} onPress={toggleFlash} activeOpacity={0.7}>
                                <View style={styles.bottomControlButtonBg}>
                                    <IconSymbol name={getFlashIcon() as any} size={22} color={colors.system.white} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Flash effect overlay */}
            <Animated.View style={[styles.flashOverlay, flashOverlayStyle]} pointerEvents="none" />

            {/* Checkmark animation */}
            <Animated.View style={[styles.checkmarkOverlay, checkmarkAnimStyle]}>
                <View style={styles.checkmarkCircle}>
                    <IconSymbol name="checkmark" size={48} color={colors.system.white} />
                </View>
            </Animated.View>

            <View style={[styles.bottomControlsWrapper, { paddingBottom: insets.bottom + 16 }]}>
                {/* Ghost item thumbnails - only show when has ghost items */}
                {hasGhostItems && (
                    <View style={styles.thumbnailsContainer}>
                        <FlatList
                            data={ghostItemsData}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.thumbnailsList}
                            keyExtractor={(item, index) => item.gostId || String(index)}
                            renderItem={({ item: ghostItem, index }) => {
                                const ghostId = ghostItem.gostId;
                                const photo = capturedPhotos.find((p) => p.templateId === ghostId);
                                const isActive = index === currentGhostIndex;
                                const isCompleted = !!photo;
                                // Use iconUrl (icon.url) for thumbnails, fallback to local icon
                                const iconSource = ghostItem.iconUrl ? { uri: ghostItem.iconUrl } : isGhostItemId(ghostId) ? getGhostIcon(ghostId) : null;
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setCurrentGhostIndex(index);
                                        }}
                                        style={[styles.thumbnail, isActive && styles.thumbnailActive, isCompleted && styles.thumbnailCompleted]}
                                    >
                                        {photo ? (
                                            <>
                                                <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
                                                <View style={styles.thumbnailCheck}>
                                                    <IconSymbol name="checkmark.circle.fill" size={16} color={MINT_COLOR} />
                                                </View>
                                            </>
                                        ) : iconSource ? (
                                            <Image
                                                source={iconSource}
                                                style={styles.thumbnailIcon}
                                                contentFit="contain"
                                                onError={(error) => {
                                                    console.log("Icon load error for:", ghostId, error);
                                                }}
                                            />
                                        ) : (
                                            <View style={styles.thumbnailPlaceholder}>
                                                <BaseText type="Caption2" color="labels.tertiary">
                                                    {index + 1}
                                                </BaseText>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )}

                <View style={styles.bottomControls}>
                    {/* Gallery Thumbnail */}
                    <TouchableOpacity style={styles.galleryThumbnail} activeOpacity={0.8}>
                        {capturedPhotos.length > 0 ? <Image source={{ uri: capturedPhotos[capturedPhotos.length - 1].uri }} style={styles.galleryThumbnailImage} /> : <View style={styles.galleryThumbnailPlaceholder} />}
                    </TouchableOpacity>

                    {/* Shutter Button */}
                    <TouchableOpacity style={styles.shutterButton} onPress={handleTakePhoto} activeOpacity={0.9} disabled={isCapturing}>
                        <View style={styles.shutterOuter}>
                            <View style={styles.shutterInner}>{isCapturing && <ActivityIndicator color={colors.system.gray3} size="small" />}</View>
                        </View>
                    </TouchableOpacity>

                    {/* Switch Camera */}
                    <TouchableOpacity style={styles.switchCameraButton} onPress={toggleCamera} activeOpacity={0.7}>
                        <IconSymbol name="arrow.triangle.2.circlepath.camera" size={28} color={colors.system.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Guide Modal */}
            {/* <Modal visible={showGuideModal} transparent animationType="fade" onRequestClose={handleCloseGuide}>
                <View style={styles.guideModalContainer}>
                    <View style={[styles.guideModalContent, { paddingBottom: insets.bottom }]}>
                        <Image source={require("@/assets/gost/Guid.png")} style={styles.guideImage} contentFit="contain" />
                        <BaseText type="Title1" weight={600} color="labels.primary" className="mt-4 text-center">
                            {getTemplateName()}
                        </BaseText>
                        <BaseText type="Body" align="center" color="labels.primary" className="text-center mt-2 px-8">
                            Place The Head Between Lines and keep eye line leveled.
                        </BaseText>
                        <TouchableOpacity style={styles.closeGuideButton} onPress={handleCloseGuide} activeOpacity={0.8}>
                            <BaseText type="Body" weight={600} color="system.white">
                                Close
                            </BaseText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal> */}

            {/* Sample Modal */}
            <Modal visible={showSampleModal} transparent animationType="fade" onRequestClose={handleCloseSample}>
                <View style={styles.guideModalContainer}>
                    <View style={[styles.guideModalContent, { paddingBottom: insets.bottom }]}>
                        {currentGhostData && (
                            <>
                                {currentGhostData.sampleImageUrl ? (
                                    <Image source={{ uri: currentGhostData.sampleImageUrl }} style={styles.guideImage} contentFit="contain" />
                                ) : currentGhostData.imageUrl ? (
                                    <Image source={{ uri: currentGhostData.imageUrl }} style={styles.guideImage} contentFit="contain" />
                                ) : currentGhostItem ? (
                                    <Image source={getGhostSample(currentGhostItem)} style={styles.guideImage} contentFit="contain" />
                                ) : null}
                                <BaseText type="Title1" weight={600} color="labels.primary" align="center" className="mt-4 text-center">
                                    {getTemplateName()}
                                </BaseText>
                                <BaseText type="Body" align="center" color="labels.primary" className="text-center mt-2 px-8">
                                    {getTemplateDescription()}
                                </BaseText>
                            </>
                        )}
                        <TouchableOpacity style={styles.closeGuideButton} onPress={handleCloseSample} activeOpacity={0.8}>
                            <BaseText type="Body" weight={600} color="system.white">
                                Close
                            </BaseText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.black,
    },
    viewportMask: {
        position: "absolute",
        backgroundColor: colors.system.black,
        zIndex: 1,
    },
    viewportContainer: {
        position: "absolute",
        overflow: "hidden",
        zIndex: 2,
    },
    permissionContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    permissionButton: {
        marginTop: 24,
        backgroundColor: colors.system.blue,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: colors.system.black,
        zIndex: 10,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
    },
    headerControlButtonBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 22,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
    },
    closeButtonBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 22,
    },
    patientInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        marginLeft: 12,
    },
    patientTextContainer: {
        alignItems: "flex-start",
    },
    templateBadge: {
        position: "absolute",
        top: 120,
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    templateButtonContainer: {
        position: "absolute",
        bottom: 160,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    bottomControlsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "transparent",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 20,
    },
    bottomControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: "hidden",
    },
    bottomControlButtonBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 22,
    },
    templateButton: {
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonHeader: {
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonHeaderDisabled: {
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    ghostOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    ghostImage: {
        width: "100%",
        height: "100%",
        opacity: 0.5,
    },
    capturedPhotoOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    capturedPhotoImage: {
        width: "100%",
        height: "100%",
        opacity: 1,
    },
    bottomControlsWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.system.black,
        paddingTop: 16,
        zIndex: 10,
    },
    thumbnailsContainer: {
        marginBottom: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    sampleButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,199,190,0.8)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    sampleButtonAbsolute: {
        position: "absolute",
        left: 0,
        right: 0,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,199,190,0.8)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    thumbnailsList: {
        gap: 4,
    },
    thumbnail: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
        overflow: "hidden",
    },
    thumbnailActive: {
        borderColor: colors.system.blue,
    },
    thumbnailCompleted: {
        borderColor: MINT_COLOR,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailCheck: {
        position: "absolute",
        top: 2,
        right: 2,
    },
    thumbnailPlaceholder: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    thumbnailIcon: {
        width: "100%",
        height: "100%",
        borderRadius: 8,
    },
    bottomControls: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 30,
    },
    galleryThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    galleryThumbnailImage: {
        width: "100%",
        height: "100%",
    },
    galleryThumbnailPlaceholder: {
        width: "100%",
        height: "100%",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
        borderRadius: 8,
    },
    shutterButton: {
        width: 76,
        height: 76,
        justifyContent: "center",
        alignItems: "center",
    },
    shutterOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 5,
        borderColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    shutterInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    switchCameraButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.system.white,
    },
    checkmarkOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    checkmarkCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: MINT_COLOR,
        justifyContent: "center",
        alignItems: "center",
    },
    cameraViewportDebug: {
        position: "absolute",
        left: 0,
        right: 0,
        borderWidth: 4,
        borderColor: "rgba(255,255,0,0.8)", // Yellow border for debugging
        backgroundColor: "rgba(255,255,0,0.1)", // Light yellow background
    },
    gridContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    gridLine: {
        position: "absolute",
        backgroundColor: "rgba(255,255,255,0.3)",
    },
    gridVertical: {
        width: 1,
        top: 0,
        bottom: 0,
    },
    gridHorizontal: {
        height: 1,
        left: 0,
        right: 0,
    },
    guideModalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    guideModalContent: {
        backgroundColor: colors.system.white,
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        width: SCREEN_WIDTH * 0.85,
    },
    guideImage: {
        width: "100%",
        height: SCREEN_WIDTH * 1.085,
    },
    closeGuideButton: {
        marginTop: 20,
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        width: "70%",
        alignItems: "center",
    },
});
