import { BaseText } from "@/components";
import colors from "@/theme/colors";
import React, { useEffect, useRef, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { ImageEditorToolProps, MagicColorOption, MagicStyleOption } from "./types";

const StyleOptionButton: React.FC<{
    item: MagicStyleOption;
    isSelected: boolean;
    pulse: SharedValue<number>;
    onPress: () => void;
}> = ({ item, isSelected, pulse, onPress }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: isSelected ? 1 + 0.15 * pulse.value : 1 }],
    }));
    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity onPress={onPress} style={{ borderColor: isSelected ? colors.labels.primary : "#D1D1D6" }} className="items-center justify-center gap-2 w-[52px] h-[52px] border border-[#D1D1D6] rounded-full">
                <Image source={item.imageUri} style={{ width: 28, height: 28, resizeMode: "contain" }} resizeMode="contain" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const ColorOptionButton: React.FC<{
    item: MagicColorOption;
    isSelected: boolean;
    pulse: SharedValue<number>;
    onPress: () => void;
}> = ({ item, isSelected, pulse, onPress }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + 0.04 * pulse.value }],
    }));
    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity onPress={onPress} className="items-center justify-center gap-2">
                <View
                    style={{
                        borderColor: isSelected ? "#D1D1D6" : "transparent",
                        padding: isSelected ? 4 : 0,
                        borderRadius: isSelected ? 20 : 16,
                    }}
                    className="w-[64px] h-[64px] border rounded-2xl"
                >
                    <View className="w-full h-full bg-[#4D4D4D] rounded-2xl items-center justify-center">
                        <Image source={item.image} style={{ width: 28, height: 45, resizeMode: "contain", top: 5 }} resizeMode="contain" />
                    </View>
                </View>
                <BaseText type="Caption1" color={isSelected ? "labels.primary" : "labels.secondary"}>
                    {item.title}
                </BaseText>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const ToolMagic: React.FC<ImageEditorToolProps> = ({ onChange }) => {
    const colorOptions: MagicColorOption[] = [
        { title: "A1", modeKey: "Mode_A1", image: require("@/assets/images/tothColor/A1.png") },
        { title: "C1", modeKey: "Mode_C1", image: require("@/assets/images/tothColor/C1.png") },
        { title: "D3", modeKey: "Mode_D3", image: require("@/assets/images/tothColor/D3.png") },
        { title: "A2", modeKey: "Mode_A2", image: require("@/assets/images/tothColor/C2.png") },
    ];

    const styleOptions: MagicStyleOption[] = [
        {
            title: "Bleaching",
            resultType: "orig",
            imageUri: require("@/assets/images/tothShape/bleaching.png"),
        },
        {
            title: "Crown",
            resultType: "pred",
            imageUri: require("@/assets/images/tothShape/crown.png"),
        },
        {
            title: "Venier",
            resultType: "pred",
            imageUri: require("@/assets/images/tothShape/venier.png"),
        },
    ];

    const [selectedColor, setSelectedColor] = useState<MagicColorOption>(colorOptions[0]);
    const [selectedStyle, setSelectedStyle] = useState<MagicStyleOption>(styleOptions[0]);
    const stylePulse = useSharedValue(0);
    const isFirstStyleMount = useRef(true);

    useEffect(() => {
        onChange({
            type: "magic",
            data: { color: selectedColor, style: selectedStyle },
        });
    }, [selectedColor, selectedStyle]);

    useEffect(() => {
        if (isFirstStyleMount.current) {
            isFirstStyleMount.current = false;
            return;
        }
        stylePulse.value = 0;
        stylePulse.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0.35, { duration: 180 }));
    }, [selectedStyle]);

    return (
        <View className="gap-4 pb-2 ">
            <Animated.View
                entering={FadeIn.duration(220)}
                className="absolute left-0 right-0 -top-10 items-center justify-center z-10"
                pointerEvents="none"
            >
                <View className="bg-white px-2 py-1 rounded-lg">
                    <BaseText type="Subhead" color="labels.primary">
                        {selectedStyle.title}
                    </BaseText>
                </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(280).delay(60).springify().damping(18)} className="flex-row items-center justify-center gap-5 pt-4">
                {styleOptions.map((item) => (
                    <StyleOptionButton key={item.title} item={item} isSelected={selectedStyle.title === item.title} pulse={stylePulse} onPress={() => setSelectedStyle(item)} />
                ))}
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(280).delay(140).springify().damping(18)} className="flex-row items-center justify-center gap-4">
                {colorOptions.map((item) => (
                    <ColorOptionButton key={item.title} item={item} isSelected={selectedColor.title === item.title} pulse={stylePulse} onPress={() => setSelectedColor(item)} />
                ))}
            </Animated.View>
        </View>
    );
};
