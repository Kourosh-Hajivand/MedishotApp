import { BaseText } from "@/components";
import { AdjustChange, ImageChange, MagicChange, ToolAdjust, ToolCrop, ToolMagic, ToolNote, ToolPen } from "@/components/ImageEditor";
import { FilteredImage } from "@/components/ImageEditor/FilteredImage";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import colors from "@/theme/colors.shared";
import { Button, Host, Text } from "@expo/ui/swift-ui";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { SymbolViewProps } from "expo-symbols";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const API_URL = "https://o37fm6z14czkrl-8080.proxy.runpod.net/invocations";

interface ImageEditorModalProps {
    visible: boolean;
    uri?: string;
    initialTool?: string;
    onClose: () => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ visible, uri, initialTool, onClose }) => {
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
    const hasRequestedRef = useRef(false);

    const scale = useSharedValue(1);
    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = e.scale;
        })
        .onEnd(() => {
            scale.value = withTiming(1, { duration: 200 });
        });

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const tools: { name: string; icon: SymbolViewProps["name"]; disabled: boolean }[] = [
        { name: "Adjust", icon: "dial.min.fill", disabled: false },
        { name: "Crop", icon: "crop.rotate", disabled: false },
        { name: "Note", icon: "pin.circle.fill", disabled: false },
        { name: "Magic", icon: "sparkles", disabled: false },
        { name: "Pen", icon: "pencil.tip.crop.circle", disabled: false },
    ];

    const handleToolPress = (tool: string) => {
        Haptics.selectionAsync();
        setActiveTool(tool);
    };

    const applyAdjustments = async (imageUri: string, adjustments: AdjustChange): Promise<string | null> => {
        try {
            if (!adjustments || Object.keys(adjustments).length === 0 || !imageUri) {
                return imageUri;
            }

            // Check if any adjustment has a non-zero value
            const hasAdjustments = Object.values(adjustments).some((val) => val !== undefined && val !== 0);
            if (!hasAdjustments) {
                return originalImageUri || imageUri;
            }

            const brightness = adjustments.brightness !== undefined ? adjustments.brightness / 100 : 0;

            return imageUri;
        } catch (error) {
            console.error("Error applying adjustments:", error);
            return imageUri;
        }
    };

    const handleImageChange = async (change: ImageChange) => {
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
    };

    // ✅ تبدیل عکس به base64
    const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
        try {
            if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
                if (!FileSystem.documentDirectory) {
                    console.error("Document directory not available");
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
                return null;
            } else {
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                return base64;
            }
        } catch (error) {
            console.error("Error converting image to base64:", error);
            return null;
        }
    };

    // ✅ ارسال به API
    const sendImageToAPI = async (imageBase64: string) => {
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

        const { data } = await axios.post(API_URL, requestBody, {
            headers: { "Content-Type": "application/json" },
            timeout: 1800000,
        });

        console.log("✅ Response keys:", data);
        return data;
    };

    useEffect(() => {
        if (visible) {
            hasRequestedRef.current = false;
            setDisplayedImageUri(uri ?? null);
            setOriginalImageUri(uri ?? null);
            setAdjustmentValues(null);
            // Set initial tool if provided
            if (initialTool) {
                setActiveTool(initialTool);
            }
        }
    }, [uri, initialTool, visible]);

    useEffect(() => {
        if (!magicSelection) return;
        updateDisplayedImageFromResult(magicSelection);
    }, [magicSelection, resultImages]);

    const formatBase64ToDataUri = (value: string) => {
        if (!value) return null;
        return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
    };

    const getResultImageForSelection = (selection: { modeKey: string; resultType: "orig" | "pred" }) => {
        const { modeKey, resultType } = selection;
        if (!modeKey) return null;
        const normalizedModeKey = modeKey.toLowerCase();
        const entries = Object.entries(resultImages);

        const expectedKey = `${resultType === "orig" ? "orig" : "pred"}_img_teeth_${modeKey}`.toLowerCase();
        const directMatch = entries.find(([key]) => key.toLowerCase() === expectedKey);
        if (directMatch?.[1]) return directMatch[1];

        const fallback = entries.find(([key]) => key.toLowerCase().includes(normalizedModeKey));
        return fallback?.[1] ?? null;
    };

    const updateDisplayedImageFromResult = (selection: { modeKey: string; resultType: "orig" | "pred"; colorTitle: string; styleTitle: string }) => {
        const resultImage = getResultImageForSelection(selection);
        if (resultImage) {
            const formatted = formatBase64ToDataUri(resultImage);
            if (formatted) {
                console.log("🖼️ نمایش:", selection.colorTitle);
                setDisplayedImageUri(formatted);
                return;
            }
        }
        console.log("🖼️ نمایش:", "اصلی");
        setDisplayedImageUri(uri ?? null);
    };

    useEffect(() => {
        const processImage = async () => {
            if (!uri || !visible) return;
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
                }
            } catch (error) {
                console.error("❌ Error processing image:", error);
            } finally {
                setIsProcessing(false);
                setIsLoading(false);
            }
        };

        processImage();
    }, [uri, activeTool, visible]);

    const renderActiveToolPanel = () => {
        const imageUri = uri || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900";
        const commonProps = {
            imageUri,
            onChange: handleImageChange,
            onApply: () => console.log("Apply changes"),
            onCancel: () => console.log("Cancel changes"),
        };

        switch (activeTool) {
            case "Adjust":
                return <ToolAdjust {...commonProps} />;
            case "Crop":
                return <ToolCrop {...commonProps} />;
            case "Note":
                return <ToolNote {...commonProps} />;
            case "Magic":
                return <ToolMagic {...commonProps} />;
            case "Pen":
                return <ToolPen {...commonProps} />;
            default:
                return null;
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
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
                        <Button variant="bordered" color="#787880" onPress={onClose}>
                            <Text color="black">Cancel</Text>
                        </Button>
                    </Host>

                    <Host style={{ width: 65, height: 40 }}>
                        <Button variant="glassProminent" color="#FFCC00" onPress={onClose}>
                            <Text color="black">Done</Text>
                        </Button>
                    </Host>
                </View>

                <View style={styles.canvasContainer}>
                    <GestureDetector gesture={pinch}>
                        <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                            <View style={styles.imageContainer}>
                                <FilteredImage source={{ uri: displayedImageUri ?? uri ?? "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900" }} style={styles.image} adjustments={adjustmentValues} />
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
        </Modal>
    );
};

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
        width: width,
        height: height * 0.55,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        width: "100%",
        height: "100%",
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
