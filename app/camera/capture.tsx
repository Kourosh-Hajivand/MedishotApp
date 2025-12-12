import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { CameraState, CapturedPhoto, FlashMode } from "@/utils/types/camera.types";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const THUMBNAIL_SIZE = 48;

export default function CaptureScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraView>(null);
    const [permission] = useCameraPermissions();

    const { patientId, patientName, patientAvatar, doctorName, templateId, ghostItems } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
        templateId: string;
        ghostItems: string;
    }>();

    // Parse ghost items
    const ghostItemIds: string[] = ghostItems ? JSON.parse(ghostItems) : [];

    // Ghost items mapping - using PNG
    const GHOST_ITEMS_MAP: Record<string, any> = {
        face: require("@/assets/gost/face.png"),
        leftFace: require("@/assets/gost/leftFace.png"),
        tooth: require("@/assets/gost/toth.png"),
    };

    const [currentGhostIndex, setCurrentGhostIndex] = useState(0);
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showRetakePreview, setShowRetakePreview] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(true);

    const [cameraState, setCameraState] = useState<CameraState>({
        flashMode: "auto",
        cameraPosition: "back",
        isGridEnabled: true,
        zoomLevel: 1,
    });

    // Animation values
    const shutterScale = useSharedValue(1);
    const flashAnim = useSharedValue(0);
    const ghostOpacity = useSharedValue(1);
    const checkmarkScale = useSharedValue(0);

    const currentGhostItem = ghostItemIds[currentGhostIndex];
    const currentGhostImage = currentGhostItem ? GHOST_ITEMS_MAP[currentGhostItem] : null;
    const isLastGhost = currentGhostIndex === ghostItemIds.length - 1;
    const allPhotosCaptures = capturedPhotos.length === ghostItemIds.length;

    // Get template name for guide modal
    const getTemplateName = () => {
        if (currentGhostItem === "face") return "Front Face Template";
        if (currentGhostItem === "leftFace") return "Left Face Template";
        if (currentGhostItem === "tooth") return "Tooth Template";
        return "Template";
    };

    const handleCloseGuide = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowGuideModal(false);
    };

    const handleTakePhoto = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Shutter animation
        shutterScale.value = withSequence(withTiming(0.9, { duration: 100 }), withSpring(1, { damping: 10 }));

        // Flash animation
        flashAnim.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 150 }));

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.9,
                skipProcessing: false,
            });

            if (photo) {
                const newPhoto: CapturedPhoto = {
                    id: `photo-${Date.now()}`,
                    uri: photo.uri,
                    templateId: currentGhostItem || "",
                    templateName: currentGhostItem || "",
                    timestamp: Date.now(),
                    isCompleted: true,
                };

                setCapturedPhotos((prev) => {
                    const existing = prev.findIndex((p) => p.templateId === currentGhostItem);
                    if (existing !== -1) {
                        const updated = [...prev];
                        updated[existing] = newPhoto;
                        return updated;
                    }
                    return [...prev, newPhoto];
                });

                // Show checkmark animation
                checkmarkScale.value = withSequence(withSpring(1.2, { damping: 8 }), withSpring(1, { damping: 10 }));

                // Move to next ghost item after delay
                setTimeout(() => {
                    checkmarkScale.value = withTiming(0, { duration: 200 });
                    if (!isLastGhost) {
                        setCurrentGhostIndex((prev) => prev + 1);
                    } else {
                        // All photos taken, go to review
                        handleGoToReview();
                    }
                }, 800);
            }
        } catch (error) {
            console.error("Error taking photo:", error);
        } finally {
            setIsCapturing(false);
        }
    }, [currentGhostItem, isCapturing, isLastGhost]);

    const handleSelectThumbnail = (photo: CapturedPhoto, index: number) => {
        Haptics.selectionAsync();
        setPreviewPhoto(photo);
        setShowRetakePreview(true);
    };

    const handleRetake = () => {
        if (!previewPhoto) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Find ghost item index
        const ghostIndex = ghostItemIds.findIndex((id) => id === previewPhoto.templateId);
        if (ghostIndex !== -1) {
            setCurrentGhostIndex(ghostIndex);
        }

        // Remove the photo
        setCapturedPhotos((prev) => prev.filter((p) => p.id !== previewPhoto.id));
        setShowRetakePreview(false);
        setPreviewPhoto(null);
    };

    const handleClosePreview = () => {
        setShowRetakePreview(false);
        setPreviewPhoto(null);
    };

    const handleGoToReview = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: "/camera/review" as any,
            params: {
                patientId,
                patientName,
                patientAvatar,
                doctorName,
                photos: JSON.stringify(capturedPhotos),
            },
        });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const toggleFlash = () => {
        Haptics.selectionAsync();
        const modes: FlashMode[] = ["auto", "on", "off"];
        const currentIndex = modes.indexOf(cameraState.flashMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setCameraState((prev) => ({ ...prev, flashMode: modes[nextIndex] }));
    };

    const toggleGrid = () => {
        Haptics.selectionAsync();
        setCameraState((prev) => ({ ...prev, isGridEnabled: !prev.isGridEnabled }));
    };

    const getFlashIcon = () => {
        switch (cameraState.flashMode) {
            case "on":
                return "bolt.fill";
            case "off":
                return "bolt.slash";
            default:
                return "bolt.badge.automatic";
        }
    };

    // Animated styles
    const flashOverlayStyle = useAnimatedStyle(() => ({
        opacity: flashAnim.value,
    }));

    const shutterAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: shutterScale.value }],
    }));

    const checkmarkAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkmarkScale.value }],
        opacity: checkmarkScale.value,
    }));

    if (!permission?.granted) {
        return (
            <View style={[styles.container, styles.centered]}>
                <BaseText color="labels.primary">Camera permission required</BaseText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraState.cameraPosition} flash={cameraState.flashMode} zoom={0}>
                {/* Grid Overlay */}
                {cameraState.isGridEnabled && (
                    <View style={styles.gridContainer}>
                        <View style={[styles.gridLine, styles.gridVertical, { left: "33.33%" }]} />
                        <View style={[styles.gridLine, styles.gridVertical, { left: "66.66%" }]} />
                        <View style={[styles.gridLine, styles.gridHorizontal, { top: "33.33%" }]} />
                        <View style={[styles.gridLine, styles.gridHorizontal, { top: "66.66%" }]} />
                    </View>
                )}

                {/* Template Overlay */}
                <View style={styles.templateOverlay}>
                    <View style={styles.templateFrame}>
                        {/* Ghost item overlay */}
                        {currentGhostImage && (
                            <View style={styles.ghostOverlayContainer}>
                                <Image source={currentGhostImage} style={styles.ghostOverlayImage} contentFit="contain" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Flash effect overlay */}
                <Animated.View style={[styles.flashOverlay, flashOverlayStyle]} pointerEvents="none" />

                {/* Checkmark animation */}
                <Animated.View style={[styles.checkmarkOverlay, checkmarkAnimStyle]}>
                    <View style={styles.checkmarkCircle}>
                        <IconSymbol name="checkmark" size={48} color={colors.system.white} />
                    </View>
                </Animated.View>

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <IconSymbol name="chevron.left" size={24} color={colors.system.white} />
                    </TouchableOpacity>

                    <View style={styles.patientInfo}>
                        <Avatar name={patientName || "Patient"} size={36} haveRing imageUrl={patientAvatar} />
                        <View style={styles.patientText}>
                            <BaseText type="Subhead" weight={600} color="labels.primary">
                                {patientName || "Patient"}
                            </BaseText>
                            <BaseText type="Caption1" color="labels.secondary">
                                {doctorName || "Doctor"}
                            </BaseText>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={allPhotosCaptures ? handleGoToReview : undefined} disabled={!allPhotosCaptures}>
                        <BaseText type="Subhead" weight={600} color={allPhotosCaptures ? "system.blue" : "labels.tertiary"}>
                            Save
                        </BaseText>
                    </TouchableOpacity>
                </View>

                {/* Template name badge */}
                <View style={styles.templateBadge}>
                    <BaseText type="Caption1" weight={600} color="labels.primary">
                        {currentGhostItem || "Ghost Item"}
                    </BaseText>
                </View>

                {/* Controls Bar */}
                <View style={styles.controlsRow}>
                    <TouchableOpacity style={styles.controlBtn} onPress={toggleFlash}>
                        <IconSymbol name={getFlashIcon() as any} size={22} color={colors.system.white} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlBtn} onPress={toggleGrid}>
                        <IconSymbol name="grid" size={22} color={cameraState.isGridEnabled ? colors.system.teal : colors.system.white} />
                    </TouchableOpacity>
                </View>

                {/* Bottom area */}
                <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Ghost item thumbnails */}
                    <View style={styles.thumbnailsContainer}>
                        <FlatList
                            data={ghostItemIds}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.thumbnailsList}
                            keyExtractor={(item, index) => `${item}-${index}`}
                            renderItem={({ item, index }) => {
                                const photo = capturedPhotos.find((p) => p.templateId === item);
                                const isActive = index === currentGhostIndex;
                                const isCompleted = !!photo;

                                return (
                                    <TouchableOpacity onPress={() => photo && handleSelectThumbnail(photo, index)} style={[styles.thumbnail, isActive && styles.thumbnailActive, isCompleted && styles.thumbnailCompleted]}>
                                        {photo ? (
                                            <>
                                                <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
                                                <View style={styles.thumbnailCheck}>
                                                    <IconSymbol name="checkmark.circle.fill" size={16} color={colors.system.teal} />
                                                </View>
                                            </>
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

                        {/* Edit/Pen button */}
                        <TouchableOpacity style={styles.editButton}>
                            <IconSymbol name="pencil" size={20} color={colors.system.teal} />
                        </TouchableOpacity>
                    </View>

                    {/* Shutter area */}
                    <View style={styles.shutterArea}>
                        {/* Last captured photo thumbnail */}
                        <View style={styles.lastPhotoContainer}>
                            {capturedPhotos.length > 0 && (
                                <TouchableOpacity onPress={() => handleSelectThumbnail(capturedPhotos[capturedPhotos.length - 1], capturedPhotos.length - 1)}>
                                    <Image source={{ uri: capturedPhotos[capturedPhotos.length - 1].uri }} style={styles.lastPhotoImage} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Shutter button */}
                        <Animated.View style={shutterAnimStyle}>
                            <TouchableOpacity style={styles.shutterButton} onPress={handleTakePhoto} activeOpacity={0.9} disabled={isCapturing}>
                                <View style={styles.shutterInner}>{isCapturing && <ActivityIndicator color={colors.system.gray3} size="small" />}</View>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Switch camera */}
                        <TouchableOpacity
                            style={styles.switchCamera}
                            onPress={() =>
                                setCameraState((prev) => ({
                                    ...prev,
                                    cameraPosition: prev.cameraPosition === "back" ? "front" : "back",
                                }))
                            }
                        >
                            <IconSymbol name="arrow.triangle.2.circlepath.camera" size={26} color={colors.system.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>

            {/* Retake Preview Modal */}
            {showRetakePreview && previewPhoto && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.previewModal}>
                    <View style={[styles.previewHeader, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={handleClosePreview} style={styles.previewClose}>
                            <IconSymbol name="xmark" size={20} color={colors.system.white} />
                        </TouchableOpacity>
                        <BaseText type="Headline" color="labels.primary">
                            {previewPhoto.templateName}
                        </BaseText>
                        <View style={{ width: 36 }} />
                    </View>

                    <Image source={{ uri: previewPhoto.uri }} style={styles.previewImage} contentFit="contain" />

                    <View style={[styles.previewFooter, { paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                            <IconSymbol name="arrow.counterclockwise" size={20} color={colors.system.white} />
                            <BaseText type="Body" weight={600} color="labels.primary" className="ml-2">
                                Retake
                            </BaseText>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* Guide Modal */}
            <Modal visible={showGuideModal} transparent animationType="fade" onRequestClose={handleCloseGuide}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Image source={require("@/assets/gost/Guid.png")} style={styles.guideImage} resizeMode="contain" />
                        <BaseText type="Title2" weight={700} color="labels.primary" className="mt-6 text-center">
                            {getTemplateName()}
                        </BaseText>
                        <BaseText type="Body" color="labels.secondary" className="mt-3 text-center px-4">
                            Place The Head Between Lines and keep eye line leveled.
                        </BaseText>
                        <TouchableOpacity style={styles.closeGuideButton} onPress={handleCloseGuide} activeOpacity={0.8}>
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

// Figma Design Colors
const MINT_COLOR = "#00c7be";
const FIGMA_COLORS = {
    mint: "#00c7be",
    buttonBg: "rgba(120,120,128,0.32)",
    buttonBgLight: "rgba(120,120,128,0.3)",
    editButtonBg: "rgba(99,230,226,0.2)",
    saveButtonInactiveBg: "rgba(235,235,245,0.16)",
    saveButtonInactiveText: "rgba(235,235,245,0.3)",
    headerBlur: "rgba(37,37,37,0.82)",
    patientName: "#f2f2f7",
    doctorName: "#aeaeb2",
    thumbnailBorderActive: "#007aff",
    thumbnailBorderCompleted: "#34c759",
    thumbnailBorderDefault: "#c6c6c8",
    separatorOpaque: "#c6c6c8",
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.black,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
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
        backgroundColor: colors.system.black,
        paddingBottom: 12,
    },
    backButton: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    patientInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    patientText: {
        alignItems: "flex-start",
    },
    saveButton: {
        backgroundColor: FIGMA_COLORS.saveButtonInactiveBg,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 40,
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
    templateOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    templateFrame: {
        width: width * 0.95, // Increased from 0.8 to 0.95 for larger ghost items
        height: width * 0.95, // Increased from 0.8 to 0.95
        justifyContent: "center",
        alignItems: "center",
    },
    templateGuide: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    ghostOverlayContainer: {
        width: "100%", // Increased from 80% to 100% for larger ghost items
        height: "100%", // Increased from 80% to 100%
        justifyContent: "center",
        alignItems: "center",
    },
    ghostOverlayImage: {
        opacity: 0.4,
        color: MINT_COLOR,
    },
    controlsRow: {
        position: "absolute",
        bottom: 220,
        left: 20,
        flexDirection: "row",
        gap: 12,
    },
    controlBtn: {
        width: 50,
        height: 50,
        borderRadius: 500,
        backgroundColor: FIGMA_COLORS.buttonBg,
        justifyContent: "center",
        alignItems: "center",
    },
    bottomArea: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingTop: 16,
    },
    thumbnailsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    thumbnailsList: {
        gap: 8,
        paddingRight: 8,
    },
    thumbnail: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.1)",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: FIGMA_COLORS.separatorOpaque,
    },
    thumbnailActive: {
        borderColor: FIGMA_COLORS.thumbnailBorderActive,
        borderWidth: 2,
    },
    thumbnailCompleted: {
        borderColor: FIGMA_COLORS.thumbnailBorderCompleted,
        borderWidth: 2,
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    thumbnailCheck: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: colors.system.white,
        borderRadius: 8,
    },
    editButton: {
        width: 50,
        height: 50,
        borderRadius: 500,
        backgroundColor: FIGMA_COLORS.editButtonBg,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    shutterArea: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 40,
    },
    lastPhotoContainer: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    lastPhotoImage: {
        width: 50,
        height: 50,
    },
    shutterButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "rgba(255,255,255,0.5)",
    },
    shutterInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    switchCamera: {
        width: 50,
        height: 50,
        borderRadius: 500,
        backgroundColor: FIGMA_COLORS.buttonBg,
        justifyContent: "center",
        alignItems: "center",
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
        backgroundColor: FIGMA_COLORS.mint,
        justifyContent: "center",
        alignItems: "center",
    },
    gridContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLine: {
        position: "absolute",
        backgroundColor: "rgba(255,255,255,0.25)",
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
    previewModal: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.system.black,
    },
    previewHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    previewClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    previewImage: {
        flex: 1,
        width: "100%",
    },
    previewFooter: {
        paddingHorizontal: 20,
        paddingTop: 16,
        alignItems: "center",
    },
    retakeButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.system.white,
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        maxWidth: width - 40,
        width: "100%",
    },
    guideImage: {
        width: width - 100,
        height: (width - 100) * 1.2,
        borderRadius: 12,
    },
    closeGuideButton: {
        marginTop: 24,
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        minWidth: 120,
        alignItems: "center",
        justifyContent: "center",
    },
});
