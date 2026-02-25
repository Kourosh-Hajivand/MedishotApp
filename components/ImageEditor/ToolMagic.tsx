import { BaseText } from "@/components";
import colors from "@/theme/colors";
import React, { useEffect, useRef, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { Easing, Extrapolation, FadeIn, FadeInLeft, interpolate, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { ImageEditorToolProps, MagicColorOption, MagicStyleOption } from "./types";

const EASE_OUT = Easing.out(Easing.cubic);
const DURATION_FAST = 180;
const DURATION_NORMAL = 220;

const StyleOptionButton: React.FC<{
    item: MagicStyleOption;
    isSelected: boolean;
    pulse: SharedValue<number>;
    onPress: () => void;
    index: number;
}> = ({ item, isSelected, pulse, onPress, index }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(isSelected ? 1 + 0.06 * pulse.value : 1, { duration: DURATION_FAST, easing: EASE_OUT }) }],
    }));

    const borderStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(isSelected ? colors.labels.primary : "#D1D1D6", { duration: DURATION_FAST, easing: EASE_OUT }),
        borderWidth: withTiming(isSelected ? 2 : 1, { duration: DURATION_FAST, easing: EASE_OUT }),
    }));

    return (
        <Animated.View
            entering={FadeInLeft.duration(DURATION_NORMAL + index * 25)
                .delay(20 + index * 30)
                .easing(EASE_OUT)}
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
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(1 + 0.02 * pulse.value, { duration: DURATION_FAST, easing: EASE_OUT }) }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(isSelected ? "#D1D1D6" : "transparent", { duration: DURATION_FAST, easing: EASE_OUT }),
        padding: withTiming(isSelected ? 4 : 0, { duration: DURATION_FAST, easing: EASE_OUT }),
        borderRadius: withTiming(isSelected ? 20 : 16, { duration: DURATION_FAST, easing: EASE_OUT }),
        transform: [{ scale: withTiming(isSelected ? 1.03 : 1, { duration: DURATION_FAST, easing: EASE_OUT }) }],
    }));

    return (
        <Animated.View
            entering={FadeInLeft.duration(DURATION_NORMAL + index * 20)
                .delay(60 + index * 25)
                .easing(EASE_OUT)}
            style={animatedStyle}
        >
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="items-center justify-center gap-2">
                <Animated.View style={containerStyle} className="w-[64px] h-[64px] border rounded-2xl">
                    <View className="w-full h-full bg-[#4D4D4D] rounded-2xl items-center justify-center overflow-hidden">
                        <Image source={item.image} style={{ width: 28, height: 45, top: 5 }} resizeMode="contain" />
                    </View>
                </Animated.View>
                <Animated.View
                    entering={FadeIn.duration(200)
                        .delay(120 + index * 25)
                        .easing(EASE_OUT)}
                >
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

export const ToolMagic: React.FC<ImageEditorToolProps> = ({ onChange, isPreviewOriginal, initialMagic }) => {
    const appliedInitialMagicRef = useRef(false);
    const [selectedColor, setSelectedColor] = useState<MagicColorOption>(() => {
        if (initialMagic) {
            const found = COLOR_OPTIONS.find((c) => c.modeKey === initialMagic.modeKey);
            if (found) return found;
        }
        return COLOR_OPTIONS[0];
    });
    const [selectedStyle, setSelectedStyle] = useState<MagicStyleOption>(() => {
        if (initialMagic) {
            const found = STYLE_OPTIONS.find((s) => s.resultType === initialMagic.resultType);
            if (found) return found;
        }
        return STYLE_OPTIONS[0];
    });
    const stylePulse = useSharedValue(0);
    const isFirstStyleMount = useRef(true);
    const titleOpacity = useSharedValue(1);

    // Apply saved magic selection when it becomes available (e.g. after async load).
    useEffect(() => {
        if (!initialMagic || appliedInitialMagicRef.current) return;
        appliedInitialMagicRef.current = true;
        const color = COLOR_OPTIONS.find((c) => c.modeKey === initialMagic.modeKey);
        const style = STYLE_OPTIONS.find((s) => s.resultType === initialMagic.resultType);
        if (color) setSelectedColor(color);
        if (style) setSelectedStyle(style);
    }, [initialMagic]);

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
        // Soft no-bounce: gentle pulse with timing
        stylePulse.value = 0;
        stylePulse.value = withSequence(withTiming(1, { duration: 120, easing: EASE_OUT }), withTiming(0, { duration: 200, easing: EASE_OUT }));
        titleOpacity.value = withSequence(withTiming(0.7, { duration: 60, easing: EASE_OUT }), withTiming(1, { duration: 180, easing: EASE_OUT }));
    }, [selectedStyle]);

    const titleAnimatedStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ scale: interpolate(titleOpacity.value, [0.7, 1], [0.97, 1], Extrapolation.CLAMP) }],
    }));

    return (
        <View className="gap-4 pb-2">
            {/* Title Badge */}
            <Animated.View entering={FadeIn.duration(220).delay(20).easing(EASE_OUT)} className="absolute left-0 right-0 -top-10 items-center justify-center z-10" pointerEvents="none">
                <Animated.View style={titleAnimatedStyle} className="bg-white px-3 py-1.5 rounded-lg shadow-sm">
                    <BaseText type="Subhead" color="labels.primary">
                        {isPreviewOriginal ? `Preview (Before)` : selectedStyle.title}
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
