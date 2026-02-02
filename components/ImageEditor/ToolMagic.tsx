import { BaseText } from "@/components";
import colors from "@/theme/colors";
import React, { useEffect, useRef, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { Extrapolation, FadeIn, FadeInLeft, interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { ImageEditorToolProps, MagicColorOption, MagicStyleOption } from "./types";

// Apple-style spring config - smooth & fast
const SPRING_CONFIG = {
    damping: 22,
    stiffness: 400,
    mass: 0.6,
};

const StyleOptionButton: React.FC<{
    item: MagicStyleOption;
    isSelected: boolean;
    pulse: SharedValue<number>;
    onPress: () => void;
    index: number;
}> = ({ item, isSelected, pulse, onPress, index }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(isSelected ? 1 + 0.12 * pulse.value : 1, SPRING_CONFIG) }],
    }));

    const borderStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(isSelected ? colors.labels.primary : "#D1D1D6", { duration: 200 }),
        borderWidth: withTiming(isSelected ? 2 : 1, { duration: 200 }),
    }));

    return (
        <Animated.View
            entering={FadeInLeft.duration(220)
                .delay(30 + index * 40)
                .springify()
                .damping(20)
                .stiffness(220)}
            style={animatedStyle}
        >
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                <Animated.View style={borderStyle} className="items-center justify-center w-[52px] h-[52px] rounded-full">
                    <Image source={item.imageUri} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const ColorOptionButton: React.FC<{
    item: MagicColorOption;
    isSelected: boolean;
    pulse: SharedValue<number>;
    onPress: () => void;
    index: number;
}> = ({ item, isSelected, pulse, onPress, index }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(1 + 0.03 * pulse.value, SPRING_CONFIG) }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(isSelected ? "#D1D1D6" : "transparent", { duration: 180 }),
        padding: withSpring(isSelected ? 4 : 0, { damping: 18, stiffness: 200 }),
        borderRadius: withSpring(isSelected ? 20 : 16, { damping: 18, stiffness: 200 }),
        transform: [{ scale: withSpring(isSelected ? 1.02 : 1, SPRING_CONFIG) }],
    }));

    return (
        <Animated.View
            entering={FadeInLeft.duration(220)
                .delay(100 + index * 35)
                .springify()
                .damping(20)
                .stiffness(220)}
            style={animatedStyle}
        >
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="items-center justify-center gap-2">
                <Animated.View style={containerStyle} className="w-[64px] h-[64px] border rounded-2xl">
                    <View className="w-full h-full bg-[#4D4D4D] rounded-2xl items-center justify-center overflow-hidden">
                        <Image source={item.image} style={{ width: 28, height: 45, top: 5 }} resizeMode="contain" />
                    </View>
                </Animated.View>
                <Animated.View entering={FadeIn.duration(180).delay(180 + index * 35)}>
                    <BaseText type="Caption1" color={isSelected ? "labels.primary" : "labels.secondary"}>
                        {item.title}
                    </BaseText>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Data
const COLOR_OPTIONS: MagicColorOption[] = [
    { title: "A1", modeKey: "Mode_A1", image: require("@/assets/images/tothColor/A1.png") },
    { title: "C1", modeKey: "Mode_C1", image: require("@/assets/images/tothColor/C1.png") },
    { title: "D3", modeKey: "Mode_D3", image: require("@/assets/images/tothColor/D3.png") },
    { title: "A2", modeKey: "Mode_A2", image: require("@/assets/images/tothColor/C2.png") },
];

const STYLE_OPTIONS: MagicStyleOption[] = [
    { title: "Bleaching", resultType: "orig", imageUri: require("@/assets/images/tothShape/bleaching.png") },
    { title: "Crown", resultType: "pred", imageUri: require("@/assets/images/tothShape/crown.png") },
    { title: "Venier", resultType: "pred", imageUri: require("@/assets/images/tothShape/venier.png") },
];

export const ToolMagic: React.FC<ImageEditorToolProps> = ({ onChange }) => {
    const [selectedColor, setSelectedColor] = useState<MagicColorOption>(COLOR_OPTIONS[0]);
    const [selectedStyle, setSelectedStyle] = useState<MagicStyleOption>(STYLE_OPTIONS[0]);
    const stylePulse = useSharedValue(0);
    const isFirstStyleMount = useRef(true);
    const titleOpacity = useSharedValue(1);

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
        // Apple-style pulse animation
        stylePulse.value = 0;
        stylePulse.value = withSequence(withSpring(1, { damping: 12, stiffness: 400 }), withSpring(0, { damping: 14, stiffness: 200 }));
        // Title fade animation on change
        titleOpacity.value = withSequence(withTiming(0.6, { duration: 80 }), withTiming(1, { duration: 200 }));
    }, [selectedStyle]);

    const titleAnimatedStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ scale: interpolate(titleOpacity.value, [0.6, 1], [0.95, 1], Extrapolation.CLAMP) }],
    }));

    return (
        <View className="gap-4 pb-2">
            {/* Title Badge */}
            <Animated.View entering={FadeIn.duration(200).delay(20).springify().damping(22)} className="absolute left-0 right-0 -top-10 items-center justify-center z-10" pointerEvents="none">
                <Animated.View style={titleAnimatedStyle} className="bg-white px-3 py-1.5 rounded-lg shadow-sm">
                    <BaseText type="Subhead" color="labels.primary">
                        {selectedStyle.title}
                    </BaseText>
                </Animated.View>
            </Animated.View>

            {/* Style Options */}
            <View className="flex-row items-center justify-center gap-5 pt-4">
                {STYLE_OPTIONS.map((item, index) => (
                    <StyleOptionButton key={item.title} item={item} index={index} isSelected={selectedStyle.title === item.title} pulse={stylePulse} onPress={() => setSelectedStyle(item)} />
                ))}
            </View>

            {/* Color Options */}
            <View className="flex-row items-center justify-center gap-4">
                {COLOR_OPTIONS.map((item, index) => (
                    <ColorOptionButton key={item.title} item={item} index={index} isSelected={selectedColor.title === item.title} pulse={stylePulse} onPress={() => setSelectedColor(item)} />
                ))}
            </View>
        </View>
    );
};
