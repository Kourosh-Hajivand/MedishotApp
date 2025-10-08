import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import colors from "../theme/colors.shared.js";

interface AvatarProps {
    name: string;
    imageUrl?: string;
    size?: number;
    haveRing?: boolean;
}

export default function Avatar({ name, imageUrl, size = 48, haveRing = false }: AvatarProps) {
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

    if (imageUrl) {
        return <Image source={{ uri: imageUrl }} style={[styles.image, { width: size, height: size }]} className="rounded-full" resizeMode="cover" />;
    }

    return (
        <View style={[styles.container, { width: size, height: size }]} className={haveRing ? `p-[2.5px] border-2 border-system-blue rounded-full` : ""}>
            <LinearGradient colors={["#C7C7CC", "#8E8E93"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.gradient}>
                <Text className="text-white font-semibold" style={[styles.text, { fontSize: size * (haveRing ? 0.3 : 0.4) }]}>
                    {initials}
                </Text>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 48,
        height: 48,
    },
    image: {
        width: 48,
        height: 48,
    },
    gradient: {
        width: "100%",
        height: "100%",
        borderRadius: 99,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    text: {
        color: colors.system.white,
        fontWeight: "600",
    },
});
