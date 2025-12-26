import { GHOST_ASSETS, type GhostItemId } from "@/assets/gost/ghostAssets";
import { getGhostDescription, getGhostIcon, getGhostName, getGhostSample } from "@/assets/gost/ghostMetadata";
import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { CameraState, CapturedPhoto, FlashMode } from "@/utils/types/camera.types";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const THUMBNAIL_SIZE = 48;
const MINT_COLOR = "#00c7be";

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

    const { patientId, patientName, patientAvatar, doctorName, ghostItems, templateId } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
        ghostItems?: string;
        templateId?: string;
    }>();

    // Parse ghost items from params
    const isGhostItemId = (value: unknown): value is GhostItemId => typeof value === "string" && Object.prototype.hasOwnProperty.call(GHOST_ASSETS, value);

    const ghostItemIds: GhostItemId[] = React.useMemo(() => {
        if (!ghostItems) return [];
        try {
            const parsed = JSON.parse(ghostItems);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(isGhostItemId);
        } catch {
            return [];
        }
    }, [ghostItems]);
    const hasGhostItems = ghostItemIds.length > 0;

    const [cameraState, setCameraState] = useState<CameraState>({
        flashMode: "auto",
        cameraPosition: "back",
        isGridEnabled: true,
        zoomLevel: 0,
    });

    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
    const [currentGhostIndex, setCurrentGhostIndex] = useState(0);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showSampleModal, setShowSampleModal] = useState(false);

    // Show guide modal when ghost items are available
    useEffect(() => {
        if (hasGhostItems) {
            setShowGuideModal(true);
        }
    }, [hasGhostItems]);

    // Animation values
    const shutterScale = useSharedValue(1);
    const flashAnim = useSharedValue(0);
    const checkmarkScale = useSharedValue(0);

    // Current ghost item
    const currentGhostItem = hasGhostItems ? ghostItemIds[currentGhostIndex] : null;
    const currentGhostImage = currentGhostItem ? GHOST_ITEMS_MAP[currentGhostItem] : null;
    const isLastGhost = currentGhostIndex === ghostItemIds.length - 1;
    const allPhotosCaptures = capturedPhotos.length === ghostItemIds.length && hasGhostItems;

    // Get template metadata
    const getTemplateName = () => {
        if (!currentGhostItem) return "Template";
        return getGhostName(currentGhostItem);
    };

    const getTemplateDescription = () => {
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
            params: { patientId, patientName, patientAvatar, doctorName },
        });
    };

    // Take photo
    const handleTakePhoto = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        shutterScale.value = withSequence(withTiming(0.9, { duration: 100 }), withSpring(1, { damping: 10 }));
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
                    templateId: currentGhostItem || "no-template",
                    templateName: currentGhostItem || "Quick Photo",
                    timestamp: Date.now(),
                    isCompleted: true,
                };

                setCapturedPhotos((prev) => {
                    // Replace if exists for this ghost item
                    const existing = prev.findIndex((p) => p.templateId === currentGhostItem);
                    if (existing !== -1) {
                        const updated = [...prev];
                        updated[existing] = newPhoto;
                        return updated;
                    }
                    return [...prev, newPhoto];
                });

                if (hasGhostItems) {
                    // Show checkmark animation only when using templates
                    checkmarkScale.value = withSequence(withSpring(1.2, { damping: 8 }), withSpring(1, { damping: 10 }));

                    setTimeout(() => {
                        checkmarkScale.value = withTiming(0, { duration: 200 });

                        if (!isLastGhost) {
                            // Move to next ghost
                            setCurrentGhostIndex((prev) => prev + 1);
                        } else {
                            // All ghosts captured, go to review
                            handleGoToReview([...capturedPhotos, newPhoto]);
                        }
                    }, 800);
                } else {
                    // No template - go to review directly without checkmark
                    handleGoToReview([newPhoto]);
                }
            }
        } catch (error) {
            console.error("Error taking photo:", error);
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, currentGhostItem, hasGhostItems, isLastGhost, capturedPhotos]);

    const handleGoToReview = (photos: CapturedPhoto[]) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: "/camera/review" as any,
            params: {
                patientId,
                patientName,
                patientAvatar,
                doctorName,
                photos: JSON.stringify(photos),
            },
        });
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const getFlashIcon = () => {
        const option = FLASH_OPTIONS.find((o) => o.mode === cameraState.flashMode);
        return option?.icon || "bolt.badge.automatic";
    };

    // Animated styles
    const shutterAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: shutterScale.value }],
    }));

    const flashOverlayStyle = useAnimatedStyle(() => ({
        opacity: flashAnim.value,
    }));

    const checkmarkAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkmarkScale.value }],
        opacity: checkmarkScale.value,
    }));

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

                {/* Ghost Overlay */}
                {currentGhostImage && (
                    <View style={styles.ghostOverlay}>
                        <View style={styles.ghostFrame}>
                            <Image source={currentGhostImage} style={styles.ghostImage} contentFit="contain" />
                        </View>
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
                        <Avatar name={patientName || "Patient"} size={32} haveRing imageUrl={patientAvatar} />
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
                        <TouchableOpacity style={styles.headerControlButton} onPress={toggleFlash} activeOpacity={0.7}>
                            <View style={styles.headerControlButtonBg}>
                                <IconSymbol name={getFlashIcon() as any} size={22} color={colors.system.white} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerControlButton} onPress={toggleGrid} activeOpacity={0.7}>
                            <View style={styles.headerControlButtonBg}>
                                <IconSymbol name="grid" size={22} color={cameraState.isGridEnabled ? colors.system.yellow : colors.system.white} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Template Badge - shows current ghost name */}
                {/* {hasGhostItems && (
                    <View style={styles.templateBadge}>
                        <BaseText type="Caption1" weight={600} color="system.white">
                            {currentGhostItem} ({currentGhostIndex + 1}/{ghostItemIds.length})
                        </BaseText>
                    </View>
                )} */}

                {/* Template Select Button - Only show when no ghost items selected */}
                {!hasGhostItems && (
                    <View style={styles.templateButtonContainer}>
                        <TouchableOpacity style={styles.templateButton} onPress={handleSelectTemplate} activeOpacity={0.8}>
                            <BaseText type="Body" weight={600} color="system.white">
                                Select a template
                            </BaseText>
                        </TouchableOpacity>
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

                {/* Bottom Controls - با یک backdrop مشترک */}
                <View style={[styles.bottomControlsWrapper, { paddingBottom: insets.bottom + 16 }]}>
                    {/* Ghost item thumbnails - only show when has ghost items */}
                    {hasGhostItems && (
                        <View style={styles.thumbnailsContainer}>
                            {/* Sample Button */}
                            <TouchableOpacity style={styles.sampleButton} onPress={handleShowSample} activeOpacity={0.8}>
                                <IconSymbol name="photo.fill" size={18} color={colors.system.white} />
                                <BaseText type="Caption1" weight={600} color="system.white" style={{ marginLeft: 6 }}>
                                    Sample
                                </BaseText>
                            </TouchableOpacity>

                            <FlatList
                                data={ghostItemIds}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.thumbnailsList}
                                keyExtractor={(item) => item}
                                renderItem={({ item, index }) => {
                                    const photo = capturedPhotos.find((p) => p.templateId === item);
                                    const isActive = index === currentGhostIndex;
                                    const isCompleted = !!photo;
                                    const iconSource = getGhostIcon(item);

                                    // Debug
                                    if (index === 0 && !photo) {
                                        console.log("🔍 Icon debug:", { item, iconSource, hasIcon: !!iconSource });
                                    }

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
                                                        console.log("Icon load error for:", item, error);
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
                        <Animated.View style={shutterAnimStyle}>
                            <TouchableOpacity style={styles.shutterButton} onPress={handleTakePhoto} activeOpacity={0.9} disabled={isCapturing}>
                                <View style={styles.shutterOuter}>
                                    <View style={styles.shutterInner}>{isCapturing && <ActivityIndicator color={colors.system.gray3} size="small" />}</View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Switch Camera */}
                        <TouchableOpacity style={styles.switchCameraButton} onPress={toggleCamera} activeOpacity={0.7}>
                            <IconSymbol name="arrow.triangle.2.circlepath.camera" size={28} color={colors.system.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>

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
                        {currentGhostItem && (
                            <>
                                <Image source={getGhostSample(currentGhostItem)} style={styles.guideImage} contentFit="contain" />
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
        backgroundColor: "rgba(0,0,0,0.3)",
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
        bottom: 180,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    templateButton: {
        backgroundColor: MINT_COLOR,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,

        alignItems: "center",
        justifyContent: "center",
    },
    ghostOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    ghostFrame: {
        width: width * 0.85,
        height: width * 0.85,
        justifyContent: "center",
        alignItems: "center",
    },
    ghostImage: {
        width: "100%",
        height: "100%",
        opacity: 0.5,
    },
    bottomControlsWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingTop: 16,
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
    thumbnailsList: {
        gap: 10,
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
    gridContainer: {
        ...StyleSheet.absoluteFillObject,
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
        width: width * 0.85,
    },
    guideImage: {
        width: "100%",
        height: width * 0.9,
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
