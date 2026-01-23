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
import { Alert, Dimensions, Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 3:2 aspect ratio – fit within canvas (full width × 55% height)
const ASPECT_RATIO = 3 / 2; // width / height
const CANVAS_MAX_WIDTH = SCREEN_WIDTH;
const CANVAS_MAX_HEIGHT = SCREEN_HEIGHT * 0.55;

let canvasWidth = CANVAS_MAX_WIDTH;
let canvasHeight = CANVAS_MAX_WIDTH / ASPECT_RATIO;
if (canvasHeight > CANVAS_MAX_HEIGHT) {
    canvasHeight = CANVAS_MAX_HEIGHT;
    canvasWidth = CANVAS_MAX_HEIGHT * ASPECT_RATIO;
}

// Constants
const API_URL = "https://o37fm6z14czkrl-8080.proxy.runpod.net/invocations";
const API_TIMEOUT_MS = 1800000; // 30 minutes
const DEFAULT_IMAGE_URI = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900";

// Note Marker Component - Draggable & Tappable
type NoteMarkerProps = {
    note: Note;
    index: number;
    containerWidth: number;
    containerHeight: number;
    onMove: (id: string, x: number, y: number) => void;
    onSelect: (id: string) => void;
};

const NoteMarker: React.FC<NoteMarkerProps> = ({ note, index, containerWidth, containerHeight, onMove, onSelect }) => {
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
        })
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
        })
        .onEnd(() => {
            markerScale.value = withSpring(1, { damping: 15, stiffness: 200 });

            // Calculate new position as percentage
            const currentX = note.x * containerWidth + translateX.value;
            const currentY = note.y * containerHeight + translateY.value;

            // Clamp to container bounds
            const clampedX = Math.max(0, Math.min(currentX, containerWidth));
            const clampedY = Math.max(0, Math.min(currentY, containerHeight));

            const newX = clampedX / containerWidth;
            const newY = clampedY / containerHeight;

            runOnJS(onMove)(note.id, newX, newY);
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

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
    const hasRequestedRef = useRef(false);

    const scale = useSharedValue(1);

    // Move note callback - update note position
    const handleMoveNote = useCallback((id: string, newX: number, newY: number) => {
        setNotes((prevNotes) => prevNotes.map((note) => (note.id === id ? { ...note, x: newX, y: newY } : note)));
    }, []);

    // Add note callback - uses functional update to get latest notes
    const addNoteCallback = useCallback(
        (locationX: number, locationY: number) => {
            const { width, height } = imageContainerLayout;

            if (width === 0 || height === 0) {
                return;
            }

            const x = locationX / width;
            const y = locationY / height;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const newNote: Note = {
                id: Date.now().toString(),
                x,
                y,
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
        [imageContainerLayout],
    );

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

        return Gesture.Exclusive(pinch, tap);
    }, [activeTool, addNoteCallback, scale]);

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
        // Set initial tool if provided
        if (initialTool) {
            setActiveTool(initialTool);
        }
    }, [uri, initialTool]);

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
                    <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                        <View
                            style={styles.imageContainer}
                            onLayout={(event) => {
                                const { width, height, x, y } = event.nativeEvent.layout;
                                setImageContainerLayout({ width, height, x, y });
                            }}
                        >
                            <FilteredImage source={{ uri: displayedImageUri ?? uri ?? DEFAULT_IMAGE_URI }} style={styles.image} adjustments={adjustmentValues} contentFit="contain" />

                            {/* Note Markers Overlay */}
                            {activeTool === "Note" && notes.map((note, index) => <NoteMarker key={note.id} note={note} index={index} containerWidth={imageContainerLayout.width} containerHeight={imageContainerLayout.height} onMove={handleMoveNote} onSelect={setActiveNoteId} />)}
                        </View>
                    </Animated.View>
                </GestureDetector>
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
        minHeight: CANVAS_MAX_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        width: canvasWidth,
        aspectRatio: 3 / 2,
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
