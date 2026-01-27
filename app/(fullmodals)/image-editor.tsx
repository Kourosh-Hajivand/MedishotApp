import { BaseText } from "@/components";
import { AdjustChange, ImageChange, MagicChange, ToolAdjust, /* ToolCrop */ ToolMagic, ToolNote, ToolPen } from "@/components/ImageEditor";
import { FilteredImage } from "@/components/ImageEditor/FilteredImage";
import { Note } from "@/components/ImageEditor/ToolNote";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import colors from "@/theme/colors.shared";
import { Button, Host } from "@expo/ui/swift-ui";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolViewProps } from "expo-symbols";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Image as RNImage, Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Canvas constraints
const CANVAS_MAX_WIDTH = SCREEN_WIDTH;
const CANVAS_MAX_HEIGHT = SCREEN_HEIGHT * 0.55;

// Constants
const API_URL = "https://o37fm6z14czkrl-8080.proxy.runpod.net/invocations";
const API_TIMEOUT_MS = 1800000; // 30 minutes
const DEFAULT_IMAGE_URI = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900";

// Debug Overlay Component
type DebugOverlayProps = {
    visible: boolean;
    touchPosition: { x: number; y: number } | null;
    notePositions: Array<{ id: string; x: number; y: number; containerWidth: number; containerHeight: number }>;
    magnifierPosition: { x: number; y: number } | null;
    containerLayout: { x: number; y: number; width: number; height: number };
};

const DebugOverlay: React.FC<DebugOverlayProps> = ({ visible, touchPosition, notePositions, magnifierPosition, containerLayout }) => {
    if (!visible) return null;

    return (
        <View
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 2000,
            }}
        >
            {/* Touch Position (Blue) */}
            {touchPosition && (
                <>
                    <View
                        style={{
                            position: "absolute",
                            left: touchPosition.x - 10,
                            top: touchPosition.y - 10,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: "#0066FF",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            left: touchPosition.x + 15,
                            top: touchPosition.y - 10,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            padding: 4,
                            borderRadius: 4,
                        }}
                    >
                        <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                            Touch: ({Math.round(touchPosition.x)}, {Math.round(touchPosition.y)})
                        </BaseText>
                    </View>
                </>
            )}

            {/* Note Positions (Green) */}
            {notePositions.map((note) => {
                const noteX = note.x * note.containerWidth + containerLayout.x;
                const noteY = note.y * note.containerHeight + containerLayout.y;
                return (
                    <React.Fragment key={note.id}>
                        <View
                            style={{
                                position: "absolute",
                                left: noteX - 10,
                                top: noteY - 10,
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: "#00FF00",
                                borderWidth: 2,
                                borderColor: "#FFFFFF",
                            }}
                        />
                        <View
                            style={{
                                position: "absolute",
                                left: noteX + 15,
                                top: noteY - 10,
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                padding: 4,
                                borderRadius: 4,
                            }}
                        >
                            <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                                Note: ({Math.round(noteX)}, {Math.round(noteY)})
                            </BaseText>
                        </View>
                        {/* Line from touch to note */}
                        {touchPosition && (
                            <View
                                style={{
                                    position: "absolute",
                                    left: Math.min(touchPosition.x, noteX),
                                    top: Math.min(touchPosition.y, noteY),
                                    width: Math.abs(touchPosition.x - noteX),
                                    height: Math.abs(touchPosition.y - noteY),
                                    borderWidth: 1,
                                    borderColor: "#00FF00",
                                    borderStyle: "dashed",
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {/* Magnifier Position (Red) */}
            {magnifierPosition && (
                <>
                    <View
                        style={{
                            position: "absolute",
                            left: magnifierPosition.x + containerLayout.x - 10,
                            top: magnifierPosition.y + containerLayout.y - 10,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: "#FF0000",
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                        }}
                    />
                    <View
                        style={{
                            position: "absolute",
                            left: magnifierPosition.x + containerLayout.x + 15,
                            top: magnifierPosition.y + containerLayout.y - 10,
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            padding: 4,
                            borderRadius: 4,
                        }}
                    >
                        <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                            Magnifier: ({Math.round(magnifierPosition.x + containerLayout.x)}, {Math.round(magnifierPosition.y + containerLayout.y)})
                        </BaseText>
                    </View>
                </>
            )}

            {/* Container Layout Info */}
            <View
                style={{
                    position: "absolute",
                    top: 100,
                    left: 20,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    padding: 8,
                    borderRadius: 8,
                }}
            >
                <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                    Container: x={Math.round(containerLayout.x)}, y={Math.round(containerLayout.y)}
                </BaseText>
                <BaseText type="Caption2" color="system.white" style={{ fontSize: 10 }}>
                    Size: {Math.round(containerLayout.width)} x {Math.round(containerLayout.height)}
                </BaseText>
            </View>
        </View>
    );
};

// Note Magnifier Component
type NoteMagnifierProps = {
    visible: boolean;
    x: number;
    y: number;
    imageUri: string;
    containerX: number;
    containerY: number;
    containerWidth: number;
    containerHeight: number;
};

const NoteMagnifier: React.FC<NoteMagnifierProps> = ({ visible, x, y, imageUri, containerX, containerY, containerWidth, containerHeight }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    React.useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
            scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        } else {
            opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
            scale.value = withTiming(0.8, { duration: 200, easing: Easing.out(Easing.ease) });
        }
    }, [visible]);

    const magnifierStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    if (!visible) return null;

    const MAGNIFIER_SIZE = 100;
    const MAGNIFIER_RADIUS = MAGNIFIER_SIZE / 2;
    const MAGNIFIER_OFFSET = 120; // Distance above finger

    // Calculate position relative to screen
    const screenX = containerX + x;
    const screenY = containerY + y - MAGNIFIER_OFFSET - MAGNIFIER_RADIUS;

    // Calculate image position in magnifier (center the touched point exactly)
    // x and y are relative to container, so we need to center that point in magnifier
    // For 2.5x zoom, the point (x, y) should be at the center of magnifier
    // The zoomed image is at position (imageX - MAGNIFIER_RADIUS, imageY - MAGNIFIER_RADIUS)
    // The point (x, y) in the zoomed image is at (x * zoomFactor, y * zoomFactor)
    // For this point to be at magnifier center (MAGNIFIER_RADIUS, MAGNIFIER_RADIUS):
    // imageX - MAGNIFIER_RADIUS + x * zoomFactor = MAGNIFIER_RADIUS
    // imageX = 2 * MAGNIFIER_RADIUS - x * zoomFactor
    const zoomFactor = 2.5;
    const imageX = 2 * MAGNIFIER_RADIUS - x * zoomFactor;
    const imageY = 2 * MAGNIFIER_RADIUS - y * zoomFactor;

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    left: screenX - MAGNIFIER_RADIUS,
                    top: screenY,
                    width: MAGNIFIER_SIZE,
                    height: MAGNIFIER_SIZE,
                    borderRadius: MAGNIFIER_RADIUS,
                    backgroundColor: colors.system.white,
                    borderWidth: 3,
                    borderColor: "#FFCC00",
                    shadowColor: colors.system.black,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    overflow: "hidden",
                    zIndex: 1000,
                },
                magnifierStyle,
            ]}
        >
            <View
                style={{
                    position: "absolute",
                    left: imageX - MAGNIFIER_RADIUS,
                    top: imageY - MAGNIFIER_RADIUS,
                    width: containerWidth * zoomFactor,
                    height: containerHeight * zoomFactor,
                }}
            >
                <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            </View>
            {/* Center indicator - small circle with yellow border (should match the red dot) */}
            <View
                style={{
                    position: "absolute",
                    left: MAGNIFIER_RADIUS - 4,
                    top: MAGNIFIER_RADIUS - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#FFCC00",
                    backgroundColor: "transparent",
                    zIndex: 1002,
                }}
            />
        </Animated.View>
    );
};

// Note Marker Component - Draggable & Tappable
type NoteMarkerProps = {
    note: Note;
    index: number;
    containerWidth: number;
    containerHeight: number;
    onMove: (id: string, x: number, y: number) => void;
    onSelect: (id: string) => void;
    onDragStart?: (id: string, x: number, y: number) => void;
    onDragUpdate?: (id: string, x: number, y: number) => void;
    onDragEnd?: (id: string) => void;
};

const NoteMarker: React.FC<NoteMarkerProps> = ({ note, index, containerWidth, containerHeight, onMove, onSelect, onDragStart, onDragUpdate, onDragEnd }) => {
    const markerScale = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    React.useEffect(() => {
        markerScale.value = withTiming(1, { duration: 200 });
    }, []);

    // Reset position when note position changes from parent
    React.useEffect(() => {
        translateX.value = 0;
        translateY.value = 0;
    }, [note.x, note.y]);

    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onSelect)(note.id);
    });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            markerScale.value = withSpring(1.2, { damping: 15, stiffness: 200 });
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            runOnJS(onSelect)(note.id); // Select on drag start
            if (onDragStart) {
                const startX = note.x * containerWidth;
                const startY = note.y * containerHeight;
                runOnJS(onDragStart)(note.id, startX, startY);
            }
        })
        .onUpdate((event) => {
            // Calculate new position and clamp to container bounds
            const currentX = note.x * containerWidth + event.translationX;
            const currentY = note.y * containerHeight + event.translationY;

            // Clamp to container bounds
            const clampedX = Math.max(0, Math.min(currentX, containerWidth));
            const clampedY = Math.max(0, Math.min(currentY, containerHeight));

            // Set translation values based on clamped position
            translateX.value = clampedX - note.x * containerWidth;
            translateY.value = clampedY - note.y * containerHeight;

            // Update magnifier position
            if (onDragUpdate) {
                runOnJS(onDragUpdate)(note.id, clampedX, clampedY);
            }
        })
        .onEnd(() => {
            markerScale.value = withSpring(1, { damping: 15, stiffness: 200 });

            // Calculate new position as percentage (already clamped in onUpdate)
            const currentX = note.x * containerWidth + translateX.value;
            const currentY = note.y * containerHeight + translateY.value;

            // Clamp to container bounds (double check)
            const clampedX = Math.max(0, Math.min(currentX, containerWidth));
            const clampedY = Math.max(0, Math.min(currentY, containerHeight));

            const newX = clampedX / containerWidth;
            const newY = clampedY / containerHeight;

            runOnJS(onMove)(note.id, newX, newY);
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

            if (onDragEnd) {
                runOnJS(onDragEnd)(note.id);
            }

            translateX.value = 0;
            translateY.value = 0;
        });

    // Combine tap and pan - pan takes priority if dragging
    const composedGesture = Gesture.Race(panGesture, tapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: markerScale.value }],
    }));

    if (containerWidth === 0 || containerHeight === 0) return null;

    const x = note.x * containerWidth;
    const y = note.y * containerHeight;

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        left: x - 15,
                        top: y - 15,
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        borderWidth: 1.5,
                        borderColor: colors.system.white,
                        shadowColor: colors.system.black,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                        alignItems: "center",
                        justifyContent: "center",
                    },
                    animatedStyle,
                ]}
            >
                <BaseText type="Caption2" color="system.white" style={{ fontSize: 13, fontWeight: "600" }}>
                    {index + 1}
                </BaseText>
            </Animated.View>
        </GestureDetector>
    );
};

export default function ImageEditorScreen() {
    const { uri, initialTool } = useLocalSearchParams<{ uri?: string; initialTool?: string }>();
    const [activeTool, setActiveTool] = useState(initialTool || "Magic");
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageChanges, setImageChanges] = useState<ImageChange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [resultImages, setResultImages] = useState<Record<string, string>>({});
    const [magicSelection, setMagicSelection] = useState<{
        modeKey: string;
        resultType: "orig" | "pred";
        colorTitle: string;
        styleTitle: string;
    } | null>(null);
    const [displayedImageUri, setDisplayedImageUri] = useState<string | null>(null);
    const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
    const [adjustmentValues, setAdjustmentValues] = useState<AdjustChange | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [imageContainerLayout, setImageContainerLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
    const [imageWrapperLayout, setImageWrapperLayout] = useState({ width: 0, height: 0 });
    const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
    const [magnifierState, setMagnifierState] = useState<{ visible: boolean; x: number; y: number; noteId: string | null }>({
        visible: false,
        x: 0,
        y: 0,
        noteId: null,
    });
    const [debugMode, setDebugMode] = useState(false);
    const [debugTouchPosition, setDebugTouchPosition] = useState<{ x: number; y: number } | null>(null);
    const hasRequestedRef = useRef(false);

    const scale = useSharedValue(1);

    // Move note callback - update note position
    const handleMoveNote = useCallback((id: string, newX: number, newY: number) => {
        setNotes((prevNotes) => prevNotes.map((note) => (note.id === id ? { ...note, x: newX, y: newY } : note)));
    }, []);

    // Magnifier callbacks
    const handleDragStart = useCallback((id: string, x: number, y: number) => {
        setMagnifierState({ visible: true, x, y, noteId: id });
    }, []);

    const handleDragUpdate = useCallback((id: string, x: number, y: number) => {
        setMagnifierState((prev) => (prev.noteId === id ? { ...prev, x, y } : prev));
    }, []);

    const handleDragEnd = useCallback((id: string) => {
        setMagnifierState((prev) => (prev.noteId === id ? { ...prev, visible: false, noteId: null } : prev));
    }, []);

    // Add note callback - uses functional update to get latest notes
    const addNoteCallback = useCallback(
        (locationX: number, locationY: number) => {
            const { width, height, x, y } = imageContainerLayout;

            if (width === 0 || height === 0) {
                return;
            }

            // Check if touch is within container bounds
            // locationX and locationY are relative to imageWrapper
            // imageContainer is at position (x, y) relative to imageWrapper
            if (locationX < x || locationX > x + width || locationY < y || locationY > y + height) {
                // Touch is outside container, don't add note
                return;
            }

            // Store touch position for debug
            if (debugMode) {
                setDebugTouchPosition({ x: locationX, y: locationY });
            }

            // Adjust touch position relative to container (subtract container offset)
            const adjustedX = locationX - x;
            const adjustedY = locationY - y;

            // Normalize to 0-1 range
            const normalizedX = adjustedX / width;
            const normalizedY = adjustedY / height;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const newNote: Note = {
                id: Date.now().toString(),
                x: normalizedX,
                y: normalizedY,
                text: "",
            };

            // Use functional update to get latest notes
            setNotes((prevNotes) => {
                const updatedNotes = [...prevNotes, newNote];
                setImageChanges((prev) => {
                    const filtered = prev.filter((c) => c.type !== "note");
                    return [...filtered, { type: "note", data: { notes: updatedNotes } }];
                });
                return updatedNotes;
            });
        },
        [imageContainerLayout, debugMode],
    );

    // Toggle debug mode
    const toggleDebugMode = useCallback(() => {
        setDebugMode((prev) => !prev);
    }, []);

    // Memoize gestures
    const composedGesture = useMemo(() => {
        const pinch = Gesture.Pinch()
            .enabled(activeTool !== "Note")
            .onUpdate((e) => {
                scale.value = e.scale;
            })
            .onEnd(() => {
                scale.value = withTiming(1, { duration: 200 });
            });

        const tap = Gesture.Tap()
            .enabled(activeTool === "Note")
            .onEnd((event) => {
                runOnJS(addNoteCallback)(event.x, event.y);
            });

        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd(() => {
                runOnJS(toggleDebugMode)();
            });

        return Gesture.Exclusive(pinch, tap, doubleTap);
    }, [activeTool, addNoteCallback, scale, toggleDebugMode]);

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const tools: { name: string; icon: SymbolViewProps["name"]; disabled: boolean }[] = [
        { name: "Adjust", icon: "dial.min.fill", disabled: false },
        // { name: "Crop", icon: "crop.rotate", disabled: false }, // TODO: not complete yet
        { name: "Note", icon: "pin.circle.fill", disabled: false },
        { name: "Magic", icon: "sparkles", disabled: false },
        { name: "Pen", icon: "pencil.tip.crop.circle", disabled: false },
    ];

    const handleToolPress = useCallback((tool: string) => {
        Haptics.selectionAsync();
        setActiveTool(tool);
    }, []);

    const applyAdjustments = useCallback(
        async (imageUri: string, adjustments: AdjustChange): Promise<string | null> => {
            try {
                if (!adjustments || Object.keys(adjustments).length === 0 || !imageUri) {
                    return imageUri;
                }

                // Check if any adjustment has a non-zero value
                const hasAdjustments = Object.values(adjustments).some((val) => val !== undefined && val !== 0);
                if (!hasAdjustments) {
                    return originalImageUri || imageUri;
                }

                // Convert adjustments to ImageManipulator format
                // Brightness: -1 to 1 (we have -100 to 100, so divide by 100)
                // Note: expo-image-manipulator only supports brightness and rotate
                // For contrast, saturation, etc., we need a different approach

                const brightness = adjustments.brightness !== undefined ? adjustments.brightness / 100 : 0;

                // Use ImageManipulator for brightness
                if (brightness !== 0) {
                    // Note: expo-image-manipulator doesn't directly support brightness
                    // We'll need to use a workaround or different library
                    // For now, store adjustments and apply via style
                }

                return imageUri;
            } catch (error) {
                Alert.alert("Error", "Failed to apply image adjustments. Please try again.");
                return imageUri;
            }
        },
        [originalImageUri],
    );

    // ✅ تبدیل عکس به base64
    const convertImageToBase64 = useCallback(async (imageUri: string): Promise<string | null> => {
        try {
            if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
                if (!FileSystem.documentDirectory) {
                    Alert.alert("Error", "Document directory not available. Please try again.");
                    return null;
                }
                const fileUri = FileSystem.documentDirectory + "temp_image.jpg";
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                if (downloadResult.status === 200) {
                    const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    return base64;
                }
                Alert.alert("Error", "Failed to download image. Please check your connection and try again.");
                return null;
            } else {
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                return base64;
            }
        } catch (error) {
            Alert.alert("Error", "Failed to convert image to base64. Please try again.");
            return null;
        }
    }, []);

    // ✅ ارسال به API
    const sendImageToAPI = useCallback(
        async (imageBase64: string) => {
            const requestBody = {
                image_base64: imageBase64,
                color_settings: {
                    saturation_scale: 0.4,
                    yellow_hue_range: [15, 45],
                    red_hue_range: [0, 15],
                    sat_range: [0, 255],
                    l_range: [0, 255],
                },
                texture_modes: {
                    Mode_A1: {
                        fade_power: 4.0,
                        center_offset: [0.0, 0.1],
                        stretch: [0.5, 0.8],
                        center_opacity: 0.5,
                        blend_opacity: 0.8,
                        mask_color: [92, 137, 170],
                    },
                    Mode_C1: {
                        fade_power: 6.0,
                        center_offset: [0.0, 0.2],
                        stretch: [0.5, 0.8],
                        center_opacity: 0.6,
                        blend_opacity: 0.8,
                        mask_color: [112, 158, 181],
                    },
                    Mode_D3: {
                        fade_power: 6.0,
                        center_offset: [0.0, 0.2],
                        stretch: [0.5, 0.6],
                        center_opacity: 0.5,
                        blend_opacity: 0.8,
                        mask_color: [101, 152, 184],
                    },
                    Mode_A2: {
                        fade_power: 4.0,
                        center_offset: [0.0, 0.3],
                        stretch: [0.5, 0.8],
                        center_opacity: 0.99,
                        blend_opacity: 0.7,
                        mask_color: [91, 137, 170],
                    },
                },
            };

            try {
                const { data } = await axios.post(API_URL, requestBody, {
                    headers: { "Content-Type": "application/json" },
                    timeout: API_TIMEOUT_MS,
                });
                return data;
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    if (error.code === "ECONNABORTED") {
                        Alert.alert("Error", "Request timed out. The image processing is taking too long. Please try again.");
                    } else {
                        Alert.alert("Error", error.response?.data?.message || "Failed to process image. Please try again.");
                    }
                } else {
                    Alert.alert("Error", "An unexpected error occurred. Please try again.");
                }
                throw error;
            }
        },
        [],
    );

    const formatBase64ToDataUri = useCallback((value: string) => {
        if (!value) return null;
        return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
    }, []);

    const getResultImageForSelection = useCallback(
        (selection: { modeKey: string; resultType: "orig" | "pred" }) => {
            const { modeKey, resultType } = selection;
            if (!modeKey) return null;
            const normalizedModeKey = modeKey.toLowerCase();
            const entries = Object.entries(resultImages);

            const expectedKey = `${resultType === "orig" ? "orig" : "pred"}_img_teeth_${modeKey}`.toLowerCase();
            const directMatch = entries.find(([key]) => key.toLowerCase() === expectedKey);
            if (directMatch?.[1]) return directMatch[1];

            const fallback = entries.find(([key]) => key.toLowerCase().includes(normalizedModeKey));
            return fallback?.[1] ?? null;
        },
        [resultImages],
    );

    const updateDisplayedImageFromResult = useCallback(
        (selection: { modeKey: string; resultType: "orig" | "pred"; colorTitle: string; styleTitle: string }) => {
            const resultImage = getResultImageForSelection(selection);
            if (resultImage) {
                const formatted = formatBase64ToDataUri(resultImage);
                if (formatted) {
                    setDisplayedImageUri(formatted);
                    return;
                }
            }
            setDisplayedImageUri(uri ?? null);
        },
        [uri, getResultImageForSelection, formatBase64ToDataUri],
    );

    const handleImageChange = useCallback(
        async (change: ImageChange) => {
            // Handle note changes separately
            if (change.type === "note") {
                const noteData = change.data as { notes: Note[] };
                setNotes(noteData.notes);
            }

            setImageChanges((prev) => {
                const filtered = prev.filter((c) => c.type !== change.type);
                return [...filtered, change];
            });

            if (change.type === "adjust") {
                const adjustments = change.data as AdjustChange;
                setAdjustmentValues(adjustments);
            } else if (change.type === "magic") {
                const { color, style } = change.data as MagicChange;
                if (color?.modeKey && style?.resultType) {
                    const selection = {
                        modeKey: color.modeKey,
                        resultType: style.resultType,
                        colorTitle: color.title,
                        styleTitle: style.title,
                    };
                    setMagicSelection(selection);
                    updateDisplayedImageFromResult(selection);
                }
            }
        },
        [updateDisplayedImageFromResult],
    );

    useEffect(() => {
        hasRequestedRef.current = false;
        setDisplayedImageUri(uri ?? null);
        setOriginalImageUri(uri ?? null);
        setAdjustmentValues(null);
        setImageAspectRatio(null); // Reset aspect ratio when URI changes
        // Set initial tool if provided
        if (initialTool) {
            setActiveTool(initialTool);
        }
    }, [uri, initialTool]);

    // Get image dimensions and calculate aspect ratio (fallback if onLoad doesn't fire)
    useEffect(() => {
        if (!uri) {
            setImageAspectRatio(null);
            return;
        }

        // Only use Image.getSize as fallback if aspectRatio is still null after a delay
        const timeoutId = setTimeout(() => {
            if (imageAspectRatio === null) {
                RNImage.getSize(
                    uri,
                    (width, height) => {
                        const ratio = width / height;
                        setImageAspectRatio(ratio);
                    },
                    (error) => {
                        console.error("Error loading image dimensions:", error);
                        // Fallback to 3:2 if error
                        setImageAspectRatio(3 / 2);
                    },
                );
            }
        }, 100); // Small delay to let onLoad fire first

        return () => clearTimeout(timeoutId);
    }, [uri, imageAspectRatio]);

    useEffect(() => {
        if (!magicSelection) return;
        updateDisplayedImageFromResult(magicSelection);
    }, [magicSelection, updateDisplayedImageFromResult]);

    useEffect(() => {
        const processImage = async () => {
            if (!uri) return;
            // Only process image for Magic tool - don't process if not on Magic tab
            if (activeTool !== "Magic") {
                // Reset loading state if not on Magic tab
                setIsLoading(false);
                setIsProcessing(false);
                return;
            }
            if (hasRequestedRef.current) return;
            hasRequestedRef.current = true;
            setIsProcessing(true);
            setIsLoading(true);
            try {
                const imageBase64 = await convertImageToBase64(uri);
                if (imageBase64) {
                    const result = await sendImageToAPI(imageBase64);
                    setResultImages(result);
                } else {
                    Alert.alert("Error", "Failed to process image. Please try again.");
                }
            } catch {
                // Error already handled in sendImageToAPI or convertImageToBase64
            } finally {
                setIsProcessing(false);
                setIsLoading(false);
            }
        };

        processImage();
    }, [uri, activeTool, convertImageToBase64, sendImageToAPI]);

    const renderActiveToolPanel = useCallback(() => {
        const imageUri = uri || DEFAULT_IMAGE_URI;
        const commonProps = {
            imageUri,
            onChange: handleImageChange,
            onApply: () => {
                // Apply changes handler
            },
            onCancel: () => {
                // Cancel changes handler
            },
        };

        switch (activeTool) {
            case "Adjust":
                return <ToolAdjust {...commonProps} />;
            // case "Crop":
            //     return <ToolCrop {...commonProps} />; // TODO: not complete yet
            case "Note":
                return <ToolNote {...commonProps} notes={notes} activeNoteId={activeNoteId} onActiveNoteChange={setActiveNoteId} />;
            case "Magic":
                return <ToolMagic {...commonProps} />;
            case "Pen":
                return <ToolPen {...commonProps} />;
            default:
                return null;
        }
    }, [uri, handleImageChange, notes, activeNoteId]);

    const handleDone = useCallback(() => {
        router.back();
    }, []);

    // Calculate dynamic image container style based on aspect ratio
    // Use actual imageWrapper height to fill available space, with smart fallback
    const dynamicImageContainerStyle = useMemo(() => {
        const aspectRatio = imageAspectRatio ?? 3 / 2; // Fallback to 3:2 if not loaded yet
        
        // Use actual wrapper dimensions if available, otherwise use screen dimensions
        const availableHeight = imageWrapperLayout.height > 0 ? imageWrapperLayout.height : CANVAS_MAX_HEIGHT;
        const availableWidth = imageWrapperLayout.width > 0 ? imageWrapperLayout.width : CANVAS_MAX_WIDTH;

        // Calculate size to maximize while preserving aspect ratio
        // First, try to fill the height
        let containerHeight = availableHeight;
        let containerWidth = containerHeight * aspectRatio;

        // If width exceeds available width, use width constraint instead
        if (containerWidth > availableWidth) {
            containerWidth = availableWidth;
            containerHeight = containerWidth / aspectRatio;
        }

        return {
            width: containerWidth,
            aspectRatio: aspectRatio,
            alignSelf: "center" as const,
        };
    }, [imageAspectRatio, imageWrapperLayout]);

    return (
        <SafeAreaView style={styles.container}>
            <Modal visible={isLoading} transparent animationType="fade">
                <View className="w-full items-center justify-center flex-1 p-3">
                    <BlurView intensity={40} tint="dark" style={styles.blurOverlay} />
                    <View className="w-full h-fit bg-white py-[60px] rounded-3xl items-center justify-center">
                        <TouchableOpacity className="items-center justify-center gap-[50px]">
                            <View style={{ borderColor: "#D1D1D6", padding: 10, borderRadius: 40 }} className="w-[220px] h-[220px] border rounded-2xl">
                                <View className="w-full h-full bg-[#4D4D4D] rounded-[35px] items-center justify-center">
                                    <Image source={require("@/assets/images/tothColor/A1Big.png")} style={{ width: 80, height: 160, resizeMode: "contain", top: 15 }} resizeMode="contain" />
                                </View>
                            </View>
                            <View className="gap-0 items-center justify-center">
                                <BaseText type="Title1" color="labels.primary">
                                    Magic Happening...
                                </BaseText>
                                <BaseText type="Body" color="labels.secondary">
                                    This may take a few minutes.
                                </BaseText>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.header}>
                <Host style={{ width: 78, height: 40 }}>
                    <Button variant="bordered" onPress={() => router.back()}>
                        Cancel
                    </Button>
                </Host>

                <Host style={{ width: 65, height: 40 }}>
                    <Button variant="glassProminent" onPress={handleDone}>
                        Done
                    </Button>
                </Host>
            </View>

            <View style={styles.canvasContainer}>
                <GestureDetector gesture={composedGesture}>
                    <Animated.View 
                        style={[styles.imageWrapper, animatedImageStyle]}
                        onLayout={(event) => {
                            const { width, height } = event.nativeEvent.layout;
                            setImageWrapperLayout({ width, height });
                        }}
                    >
                        <View
                            style={[styles.imageContainer, dynamicImageContainerStyle]}
                            onLayout={(event) => {
                                const { width, height, x, y } = event.nativeEvent.layout;
                                setImageContainerLayout({ width, height, x, y });
                            }}
                        >
                            <FilteredImage 
                                source={{ uri: displayedImageUri ?? uri ?? DEFAULT_IMAGE_URI }} 
                                style={styles.image} 
                                adjustments={adjustmentValues} 
                                contentFit="contain"
                                onLoad={(event) => {
                                    const ratio = event.width / event.height;
                                    setImageAspectRatio(ratio);
                                }}
                            />

                            {/* Note Markers Overlay */}
                            {activeTool === "Note" &&
                                notes.map((note, index) => (
                                    <NoteMarker
                                        key={note.id}
                                        note={note}
                                        index={index}
                                        containerWidth={imageContainerLayout.width}
                                        containerHeight={imageContainerLayout.height}
                                        onMove={handleMoveNote}
                                        onSelect={setActiveNoteId}
                                        onDragStart={handleDragStart}
                                        onDragUpdate={handleDragUpdate}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))}
                        </View>
                    </Animated.View>
                </GestureDetector>
                
                {/* Magnifier - rendered at canvasContainer level to appear above everything */}
                {activeTool === "Note" && magnifierState.visible && (
                    <NoteMagnifier
                        visible={magnifierState.visible}
                        x={magnifierState.x}
                        y={magnifierState.y}
                        imageUri={displayedImageUri ?? uri ?? DEFAULT_IMAGE_URI}
                        containerX={imageContainerLayout.x}
                        containerY={imageContainerLayout.y}
                        containerWidth={imageContainerLayout.width}
                        containerHeight={imageContainerLayout.height}
                    />
                )}

                {/* Debug Overlay */}
                {debugMode && (
                    <DebugOverlay
                        visible={debugMode}
                        touchPosition={debugTouchPosition}
                        notePositions={notes.map((note) => ({
                            id: note.id,
                            x: note.x,
                            y: note.y,
                            containerWidth: imageContainerLayout.width,
                            containerHeight: imageContainerLayout.height,
                        }))}
                        magnifierPosition={magnifierState.visible ? { x: magnifierState.x, y: magnifierState.y } : null}
                        containerLayout={imageContainerLayout}
                    />
                )}
            </View>

            <View className="w-full pt-4 ">{renderActiveToolPanel()}</View>

            <View className="flex-row items-center justify-center gap-5">
                {tools.map((t) => (
                    <TouchableOpacity disabled={t.disabled} key={t.name} onPress={() => handleToolPress(t.name)} className="items-center justify-center gap-1">
                        <IconSymbol name={t.icon} size={24} color={activeTool === t.name ? colors.labels.primary : t.disabled ? colors.labels.tertiary : colors.labels.secondary} />

                        <BaseText type="Caption1" color={activeTool === t.name ? "labels.primary" : t.disabled ? "labels.tertiary" : "labels.secondary"}>
                            {t.name}
                        </BaseText>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
    },
    header: {
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
    },
    canvasContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    imageWrapper: {
        width: SCREEN_WIDTH,
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    filterOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalText: {
        marginTop: 12,
        textAlign: "center",
    },
    blurOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
