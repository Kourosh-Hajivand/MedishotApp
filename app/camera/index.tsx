import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { CameraState, CapturedPhoto, FlashMode } from "@/utils/types/camera.types";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const FLASH_OPTIONS: { mode: FlashMode; icon: string; label: string }[] = [
    { mode: "auto", icon: "bolt.badge.automatic", label: "Auto" },
    { mode: "on", icon: "bolt.fill", label: "On" },
    { mode: "off", icon: "bolt.slash", label: "Off" },
];

export default function CameraScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    const { patientId, patientName, patientAvatar, doctorName } = useLocalSearchParams<{
        patientId: string;
        patientName: string;
        patientAvatar?: string;
        doctorName: string;
    }>();

    const [cameraState, setCameraState] = useState<CameraState>({
        flashMode: "auto",
        cameraPosition: "back",
        isGridEnabled: false,
        zoomLevel: 0, // Default zoom level (not zoomed)
    });

    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

    // Animation values
    const shutterScale = useSharedValue(1);
    const flashAnim = useSharedValue(0);

    // Simple toggle functions (no popup menus)
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

    // Take photo without template
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
                    templateId: "no-template",
                    templateName: "Quick Photo",
                    timestamp: Date.now(),
                    isCompleted: true,
                };

                setCapturedPhotos((prev) => [...prev, newPhoto]);

                // Navigate to review with the photo
                router.push({
                    pathname: "/camera/review" as any,
                    params: {
                        patientId,
                        patientName,
                        patientAvatar,
                        doctorName,
                        photos: JSON.stringify([newPhoto]),
                    },
                });
            }
        } catch (error) {
            console.error("Error taking photo:", error);
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, patientId, patientName, patientAvatar, doctorName]);

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

                {/* Template Select Button - Centered */}
                <View style={styles.templateButtonContainer}>
                    <TouchableOpacity style={styles.templateButton} onPress={handleSelectTemplate} activeOpacity={0.8}>
                        <BaseText type="Body" weight={600} color="system.white">
                            Select a template
                        </BaseText>
                    </TouchableOpacity>
                </View>

                {/* Flash effect overlay */}
                <Animated.View style={[styles.flashOverlay, flashOverlayStyle]} pointerEvents="none" />

                {/* Bottom Controls */}
                <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
                    {/* Gallery Thumbnail */}
                    <View style={styles.galleryContainer}>
                        <TouchableOpacity style={styles.galleryThumbnail} activeOpacity={0.8}>
                            <View style={styles.galleryThumbnailPlaceholder} />
                        </TouchableOpacity>
                    </View>

                    {/* Shutter Button Container - Takes photo directly */}
                    <View style={styles.shutterButtonContainer}>
                        <Animated.View style={shutterAnimStyle}>
                            <TouchableOpacity style={styles.shutterButton} onPress={handleTakePhoto} activeOpacity={0.9} disabled={isCapturing}>
                                <View style={styles.shutterOuter}>
                                    <View style={styles.shutterInner}>{isCapturing && <ActivityIndicator color={colors.system.gray3} size="small" />}</View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Switch Camera Container */}
                    <View style={styles.switchCameraContainer}>
                        <TouchableOpacity style={styles.switchCameraButton} onPress={toggleCamera} activeOpacity={0.7}>
                            <View style={styles.switchCameraBg}>
                                <IconSymbol name="arrow.triangle.2.circlepath.camera" size={28} color={colors.system.white} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
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
        backgroundColor: "#00c7be", // MINT_COLOR
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 999, // Fully rounded
        minWidth: 200,
        alignItems: "center",
        justifyContent: "center",
    },
    bottomControls: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 30,
        paddingTop: 20,
    },
    galleryContainer: {
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 12,
        padding: 4,
    },
    galleryThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: "hidden",
    },
    galleryThumbnailPlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
        borderRadius: 8,
    },
    shutterButtonContainer: {
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 50,
        padding: 6,
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
    switchCameraContainer: {
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 30,
        padding: 4,
    },
    switchCameraButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    switchCameraBg: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 25,
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.system.white,
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
});
