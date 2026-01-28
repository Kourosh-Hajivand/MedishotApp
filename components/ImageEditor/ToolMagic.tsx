import { BaseText } from "@/components";
import colors from "@/theme/colors";
import React, { useEffect, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { ImageEditorToolProps, MagicColorOption, MagicStyleOption } from "./types";

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

    useEffect(() => {
        onChange({
            type: "magic",
            data: { color: selectedColor, style: selectedStyle },
        });
    }, [selectedColor, selectedStyle]);

    return (
        <View className="gap-4 pb-2 pt-4">
            <View className="flex-row items-center justify-center gap-5">
                {styleOptions.map((item) => (
                    <TouchableOpacity onPress={() => setSelectedStyle(item)} key={item.title} style={{ borderColor: selectedStyle.title === item.title ? colors.labels.primary : "#D1D1D6" }} className="items-center justify-center gap-2 w-[52px] h-[52px] border border-[#D1D1D6] rounded-full">
                        <Image source={item.imageUri} style={{ width: 28, height: 28, resizeMode: "contain" }} resizeMode="contain" />
                    </TouchableOpacity>
                ))}
            </View>
            <View className="flex-row items-center justify-center gap-4">
                {colorOptions.map((item) => (
                    <TouchableOpacity onPress={() => setSelectedColor(item)} key={item.title} className="items-center justify-center gap-2">
                        <View key={item.title} style={{ borderColor: selectedColor.title === item.title ? "#D1D1D6" : "transparent", padding: selectedColor.title === item.title ? 4 : 0, borderRadius: selectedColor.title === item.title ? 20 : 16 }} className="w-[64px] h-[64px] border rounded-2xl">
                            <View className="w-full h-full bg-[#4D4D4D] rounded-2xl items-center justify-center">
                                <Image source={item.image} style={{ width: 28, height: 45, resizeMode: "contain", top: 5 }} resizeMode="contain" />
                            </View>
                        </View>
                        <BaseText type="Caption1" color={selectedColor.title === item.title ? "labels.primary" : "labels.secondary"}>
                            {item.title}
                        </BaseText>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};
