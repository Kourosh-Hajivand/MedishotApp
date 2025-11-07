import { BaseText } from "@/components";
import { ImageChange, ToolAdjust, ToolCrop, ToolMagic, ToolNote, ToolPen } from "@/components/ImageEditor";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import colors from "@/theme/colors.shared";
import { Button, Host } from "@expo/ui/swift-ui";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolViewProps } from "expo-symbols";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Image, Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const API_URL = "https://o37fm6z14czkrl-8080.proxy.runpod.net/invocations";

export default function ImageEditorScreen() {
    const { uri } = useLocalSearchParams<{ uri?: string }>();
    const [activeTool, setActiveTool] = useState("Magic");
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageChanges, setImageChanges] = useState<ImageChange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [resultImages, setResultImages] = useState<Record<string, string>>({});
    const processedUriRef = useRef<string | null>(null);
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
        { name: "Adjust", icon: "dial.min.fill", disabled: true },
        { name: "Crop", icon: "crop.rotate", disabled: true },
        { name: "Note", icon: "pin.circle.fill", disabled: true },
        { name: "Magic", icon: "sparkles", disabled: false },
        { name: "Pen", icon: "pencil.tip.crop.circle", disabled: true },
    ];

    const handleToolPress = (tool: string) => {
        Haptics.selectionAsync();
        setActiveTool(tool);
    };

    const handleImageChange = (change: ImageChange) => {
        setImageChanges((prev) => {
            const filtered = prev.filter((c) => c.type !== change.type);
            return [...filtered, change];
        });
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
                saturation_scale: 0.1,
                yellow_hue_range: [15, 45],
                red_hue_range: [0, 15],
                sat_range: [0, 255],
                l_range: [0, 255],
            },
            texture_modes: {
                Mode_A1: {
                    fade_power: 5.5,
                    center_offset: [0.0, 0.6],
                    stretch: [0.5, 0.8],
                    center_opacity: 0.5,
                    blend_opacity: 0.8,
                    mask_color: [0, 0, 255],
                },
                Mode_C1: {
                    fade_power: 4.0,
                    center_offset: [0.0, 0.5],
                    stretch: [0.6, 0.9],
                    center_opacity: 0.3,
                    blend_opacity: 0.6,
                    mask_color: [0, 255, 0],
                },
                Mode_D3: {
                    fade_power: 7.0,
                    center_offset: [0.0, 0.7],
                    stretch: [0.4, 0.7],
                    center_opacity: 0.7,
                    blend_opacity: 0.9,
                    mask_color: [255, 0, 0],
                },
                Mode_A2: {
                    fade_power: 5.5,
                    center_offset: [0.0, 0.6],
                    stretch: [0.5, 0.8],
                    center_opacity: 0.5,
                    blend_opacity: 0.7,
                    mask_color: [255, 255, 0],
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
        const processImage = async () => {
            if (!uri) return;
            if (hasRequestedRef.current) return;
            hasRequestedRef.current = true;
            processedUriRef.current = uri;
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
    }, [uri]);

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

    const handleDone = () => {
        router.back();
    };

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
                <GestureDetector gesture={pinch}>
                    <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                        <Image
                            source={{
                                uri: uri || "",
                            }}
                            style={styles.image}
                            resizeMode="cover"
                        />
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
        width: width,
        height: height * 0.55,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: "100%",
        height: "100%",
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
