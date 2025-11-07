import { BaseText } from "@/components";
import { ImageChange, ToolAdjust, ToolCrop, ToolMagic, ToolNote, ToolPen } from "@/components/ImageEditor";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import colors from "@/theme/colors.shared";
import { Button, Host } from "@expo/ui/swift-ui";

import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolViewProps } from "expo-symbols";
import React, { useState } from "react";
import { Dimensions, Image, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function ImageEditorScreen() {
    const { uri } = useLocalSearchParams<{ uri?: string }>();
    const [activeTool, setActiveTool] = useState("Magic");
    const [imageChanges, setImageChanges] = useState<ImageChange[]>([]);

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
        console.log("Image change:", change);
    };

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
        console.log("Final changes:", imageChanges);
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
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
});
