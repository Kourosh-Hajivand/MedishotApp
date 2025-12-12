import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { CameraState, FlashMode } from "@/utils/types/camera.types";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
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
        zoomLevel: 1,
    });

    const [showFlashOptions, setShowFlashOptions] = useState(false);
    const flashOptionsAnim = useSharedValue(0);

    // Animation values
    const shutterScale = useSharedValue(1);
    const controlsOpacity = useSharedValue(1);

    const toggleFlashOptions = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (showFlashOptions) {
            flashOptionsAnim.value = withTiming(0, { duration: 200 });
            setTimeout(() => setShowFlashOptions(false), 200);
        } else {
            setShowFlashOptions(true);
            flashOptionsAnim.value = withSpring(1, { damping: 15 });
        }
    };

    const selectFlashMode = (mode: FlashMode) => {
        Haptics.selectionAsync();
        setCameraState((prev) => ({ ...prev, flashMode: mode }));
        toggleFlashOptions();
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
            pathname: "/(fullmodals)/camera/template-select",
            params: { patientId, patientName, patientAvatar, doctorName },
        });
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const flashOptionsStyle = useAnimatedStyle(() => ({
        opacity: flashOptionsAnim.value,
        transform: [{ scale: interpolate(flashOptionsAnim.value, [0, 1], [0.8, 1], Extrapolation.CLAMP) }],
    }));

    const getFlashIcon = () => {
        const option = FLASH_OPTIONS.find((o) => o.mode === cameraState.flashMode);
        return option?.icon || "bolt.badge.automatic";
    };

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
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraState.cameraPosition} flash={cameraState.flashMode}>
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
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
                        <IconSymbol name="chevron.left" size={24} color={colors.system.white} />
                    </TouchableOpacity>

                    <View style={styles.patientInfo}>
                        <Avatar name={patientName || "Patient"} size={36} haveRing imageUrl={patientAvatar} />
                        <View style={styles.patientTextContainer}>
                            <BaseText type="Subhead" weight={600} color="labels.primary">
                                {patientName || "Patient Name"}
                            </BaseText>
                            <BaseText type="Caption1" color="labels.secondary">
                                {doctorName || "Dr. Name"}
                            </BaseText>
                        </View>
                    </View>

                    <View style={{ width: 36 }} />
                </View>

                {/* Controls Bar */}
                <View style={styles.controlsBar}>
                    {/* Flash Control */}
                    <View>
                        <TouchableOpacity style={styles.controlButton} onPress={toggleFlashOptions} activeOpacity={0.7}>
                            <IconSymbol name={getFlashIcon() as any} size={24} color={colors.system.white} />
                        </TouchableOpacity>

                        {showFlashOptions && (
                            <Animated.View style={[styles.flashOptions, flashOptionsStyle]}>
                                {FLASH_OPTIONS.map((option) => (
                                    <TouchableOpacity key={option.mode} style={[styles.flashOption, cameraState.flashMode === option.mode && styles.flashOptionActive]} onPress={() => selectFlashMode(option.mode)}>
                                        <BaseText type="Caption1" weight={cameraState.flashMode === option.mode ? 600 : 400} color={cameraState.flashMode === option.mode ? "system.green" : "labels.primary"}>
                                            {option.label}
                                        </BaseText>
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        )}
                    </View>

                    {/* Grid Control */}
                    <TouchableOpacity style={styles.controlButton} onPress={toggleGrid} activeOpacity={0.7}>
                        <IconSymbol name="grid" size={24} color={cameraState.isGridEnabled ? colors.system.yellow : colors.system.white} />
                    </TouchableOpacity>

                    {/* Zoom Control */}
                    <TouchableOpacity style={styles.controlButton} activeOpacity={0.7}>
                        <IconSymbol name="plus.magnifyingglass" size={24} color={colors.system.white} />
                    </TouchableOpacity>

                    {/* Template Select */}
                    <TouchableOpacity style={styles.controlButton} onPress={handleSelectTemplate} activeOpacity={0.7}>
                        <IconSymbol name="square.grid.2x2" size={24} color={colors.system.white} />
                    </TouchableOpacity>
                </View>

                {/* Bottom Controls */}
                <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Thumbnail placeholder */}
                    <View style={styles.thumbnailPlaceholder} />

                    {/* Shutter Button */}
                    <TouchableOpacity style={styles.shutterButton} onPress={handleSelectTemplate} activeOpacity={0.9}>
                        <View style={styles.shutterInner} />
                    </TouchableOpacity>

                    {/* Switch Camera */}
                    <TouchableOpacity style={styles.switchCameraButton} onPress={toggleCamera} activeOpacity={0.7}>
                        <IconSymbol name="arrow.triangle.2.circlepath.camera" size={28} color={colors.system.white} />
                    </TouchableOpacity>
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
        paddingHorizontal: 16,
        backgroundColor: "rgba(0,0,0,0.3)",
        paddingBottom: 12,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    patientInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    patientTextContainer: {
        alignItems: "flex-start",
    },
    controlsBar: {
        position: "absolute",
        bottom: 180,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        paddingHorizontal: 20,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    flashOptions: {
        position: "absolute",
        top: 50,
        left: -30,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: 12,
        padding: 8,
        flexDirection: "row",
        gap: 4,
    },
    flashOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    flashOptionActive: {
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    bottomControls: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 40,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingTop: 20,
    },
    thumbnailPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.2)",
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
    },
    switchCameraButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(255,255,255,0.2)",
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
});
