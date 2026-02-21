import { BaseText } from "@/components";
import colors from "@/theme/colors.shared";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useCallback, useState } from "react";
import { Dimensions, Pressable, Image as RNImage, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { ImageEditorToolProps } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CROP_CONTAINER_SIZE = SCREEN_WIDTH * 0.85;
const CORNER_SIZE = 24;
const MIN_CROP_SIZE = 100;

type AspectRatioOption = {
    label: string;
    ratio: number | null; // null = free
};

const ASPECT_RATIOS: AspectRatioOption[] = [
    { label: "Free", ratio: null },
    { label: "Square", ratio: 1 },
    { label: "16:9", ratio: 16 / 9 },
    { label: "4:3", ratio: 4 / 3 },
    { label: "3:2", ratio: 3 / 2 },
];

export const ToolCrop: React.FC<ImageEditorToolProps> = ({ imageUri, onChange, onApply, onCancel }) => {
    // State
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | null>(null);
    const [rotation, setRotation] = useState(0);
    const [isFlippedH, setIsFlippedH] = useState(false);
    const [isFlippedV, setIsFlippedV] = useState(false);

    // Crop area shared values
    const cropX = useSharedValue(0);
    const cropY = useSharedValue(0);
    const cropWidth = useSharedValue(CROP_CONTAINER_SIZE);
    const cropHeight = useSharedValue(CROP_CONTAINER_SIZE);
    const scale = useSharedValue(1);

    // Load image dimensions
    React.useEffect(() => {
        RNImage.getSize(
            imageUri,
            (width, height) => {
                setImageDimensions({ width, height });
                // Initialize crop area
                const aspectRatio = width / height;
                if (aspectRatio > 1) {
                    cropHeight.value = CROP_CONTAINER_SIZE;
                    cropWidth.value = CROP_CONTAINER_SIZE * aspectRatio;
                } else {
                    cropWidth.value = CROP_CONTAINER_SIZE;
                    cropHeight.value = CROP_CONTAINER_SIZE / aspectRatio;
                }
            },
            (error) => { if (__DEV__) console.error("Error loading image:", error); },
        );
    }, [imageUri]);

    // Haptic feedback
    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    // Pan gesture for moving crop area
    const panGesture = Gesture.Pan()
        .onStart(() => {
            runOnJS(triggerHaptic)();
        })
        .onUpdate((event) => {
            cropX.value = Math.max(0, Math.min(event.translationX, CROP_CONTAINER_SIZE - cropWidth.value));
            cropY.value = Math.max(0, Math.min(event.translationY, CROP_CONTAINER_SIZE - cropHeight.value));
        })
        .onEnd(() => {
            cropX.value = withSpring(cropX.value);
            cropY.value = withSpring(cropY.value);
        });

    // Pinch gesture for scaling
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            runOnJS(triggerHaptic)();
        })
        .onUpdate((event) => {
            scale.value = Math.max(1, Math.min(event.scale, 3));
        })
        .onEnd(() => {
            scale.value = withSpring(scale.value);
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    // Animated styles
    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scale.value, { duration: 200 }) }, { rotate: `${rotation}deg` }, { scaleX: isFlippedH ? -1 : 1 }, { scaleY: isFlippedV ? -1 : 1 }],
    }));

    const animatedCropAreaStyle = useAnimatedStyle(() => ({
        left: cropX.value,
        top: cropY.value,
        width: cropWidth.value,
        height: cropHeight.value,
    }));

    // Aspect ratio change handler
    const handleAspectRatioChange = (ratio: number | null) => {
        setSelectedAspectRatio(ratio);
        triggerHaptic();

        if (ratio) {
            const currentWidth = cropWidth.value;
            cropHeight.value = withSpring(currentWidth / ratio);
        }
    };

    // Rotation handler
    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
        triggerHaptic();
    };

    // Flip handlers
    const handleFlipH = () => {
        setIsFlippedH((prev) => !prev);
        triggerHaptic();
    };

    const handleFlipV = () => {
        setIsFlippedV((prev) => !prev);
        triggerHaptic();
    };

    // Apply crop
    const handleApplyCrop = async () => {
        try {
            triggerHaptic();

            // Calculate crop dimensions relative to original image
            const scaleFactorX = imageDimensions.width / CROP_CONTAINER_SIZE;
            const scaleFactorY = imageDimensions.height / CROP_CONTAINER_SIZE;

            const cropData = {
                originX: cropX.value * scaleFactorX,
                originY: cropY.value * scaleFactorY,
                width: cropWidth.value * scaleFactorX,
                height: cropHeight.value * scaleFactorY,
            };

            // Apply manipulations
            const manipulations: ImageManipulator.Action[] = [{ crop: cropData }];

            if (rotation !== 0) {
                manipulations.push({ rotate: rotation });
            }

            if (isFlippedH) {
                manipulations.push({ flip: ImageManipulator.FlipType.Horizontal });
            }

            if (isFlippedV) {
                manipulations.push({ flip: ImageManipulator.FlipType.Vertical });
            }

            const result = await ImageManipulator.manipulateAsync(imageUri, manipulations, {
                compress: 1,
                format: ImageManipulator.SaveFormat.PNG,
            });

            // Send change to parent
            onChange({
                type: "crop",
                data: {
                    x: cropData.originX,
                    y: cropData.originY,
                    width: cropData.width,
                    height: cropData.height,
                    rotation,
                },
            });

            onApply?.();
        } catch (error) {
            if (__DEV__) console.error("Error applying crop:", error);
        }
    };

    // Reset crop
    const handleReset = () => {
        cropX.value = withSpring(0);
        cropY.value = withSpring(0);
        cropWidth.value = withSpring(CROP_CONTAINER_SIZE);
        cropHeight.value = withSpring(CROP_CONTAINER_SIZE);
        scale.value = withSpring(1);
        setRotation(0);
        setIsFlippedH(false);
        setIsFlippedV(false);
        setSelectedAspectRatio(null);
        triggerHaptic();
    };

    return (
        <View style={styles.container}>
            {/* Crop Preview Area */}
            <View style={styles.cropContainer}>
                <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                        <RNImage source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                    </Animated.View>
                </GestureDetector>

                {/* Grid Overlay (3x3 like iOS) */}
                <Animated.View style={[styles.cropArea, animatedCropAreaStyle]} pointerEvents="none">
                    <View style={styles.gridOverlay}>
                        {/* Vertical lines */}
                        <View style={[styles.gridLine, { left: "33.33%", width: 1, height: "100%" }]} />
                        <View style={[styles.gridLine, { left: "66.66%", width: 1, height: "100%" }]} />
                        {/* Horizontal lines */}
                        <View style={[styles.gridLine, { top: "33.33%", height: 1, width: "100%" }]} />
                        <View style={[styles.gridLine, { top: "66.66%", height: 1, width: "100%" }]} />
                    </View>

                    {/* Corner handles */}
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />

                    {/* Border */}
                    <View style={styles.cropBorder} />
                </Animated.View>
            </View>

            {/* Aspect Ratio Selector */}
            <View style={styles.aspectRatioContainer}>
                {ASPECT_RATIOS.map((option) => (
                    <Pressable key={option.label} style={[styles.aspectRatioButton, selectedAspectRatio === option.ratio && styles.aspectRatioButtonActive]} onPress={() => handleAspectRatioChange(option.ratio)}>
                        <BaseText type="Footnote" color={selectedAspectRatio === option.ratio ? "labels.primary" : "labels.secondary"}>
                            {option.label}
                        </BaseText>
                    </Pressable>
                ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                {/* Rotation Controls */}
                <View style={styles.actionRow}>
                    <Pressable style={styles.actionButton} onPress={handleRotate}>
                        <BaseText type="Subhead" color="labels.primary">
                            🔄 Rotate
                        </BaseText>
                    </Pressable>

                    <Pressable style={styles.actionButton} onPress={handleFlipH}>
                        <BaseText type="Subhead" color="labels.primary">
                            ↔️ Flip H
                        </BaseText>
                    </Pressable>

                    <Pressable style={styles.actionButton} onPress={handleFlipV}>
                        <BaseText type="Subhead" color="labels.primary">
                            ↕️ Flip V
                        </BaseText>
                    </Pressable>
                </View>

                {/* Apply/Reset Buttons */}
                <View style={styles.actionRow}>
                    <Pressable style={[styles.actionButton, styles.resetButton]} onPress={handleReset}>
                        <BaseText type="Subhead" color="labels.primary">
                            Reset
                        </BaseText>
                    </Pressable>

                    <Pressable style={[styles.actionButton, styles.applyButton]} onPress={handleApplyCrop}>
                        <BaseText type="Subhead" color="system.white">
                            Apply Crop
                        </BaseText>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cropContainer: {
        width: CROP_CONTAINER_SIZE,
        height: CROP_CONTAINER_SIZE,
        alignSelf: "center",
        position: "relative",
        backgroundColor: colors.system.gray6,
        borderRadius: 12,
        overflow: "hidden",
    },
    imageWrapper: {
        width: "100%",
        height: "100%",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    cropArea: {
        position: "absolute",
        borderWidth: 2,
        borderColor: colors.system.white,
    },
    cropBorder: {
        position: "absolute",
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderWidth: 2,
        borderColor: colors.system.white,
        shadowColor: colors.system.black,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    gridOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    gridLine: {
        position: "absolute",
        backgroundColor: "rgba(255, 255, 255, 0.5)",
    },
    corner: {
        position: "absolute",
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        borderColor: colors.system.white,
        backgroundColor: colors.system.white,
    },
    cornerTopLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 4,
    },
    cornerTopRight: {
        top: -2,
        right: -2,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 4,
    },
    cornerBottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 4,
    },
    cornerBottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 4,
    },
    aspectRatioContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    aspectRatioButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.system.gray6,
    },
    aspectRatioButtonActive: {
        backgroundColor: colors.system.gray5,
    },
    actionContainer: {
        gap: 12,
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.system.gray6,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 100,
    },
    resetButton: {
        backgroundColor: colors.system.gray5,
    },
    applyButton: {
        backgroundColor: colors.system.blue,
        flex: 1,
    },
});
