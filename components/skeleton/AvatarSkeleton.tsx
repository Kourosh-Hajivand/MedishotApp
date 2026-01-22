import colors from "@/theme/colors.shared";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";

interface AvatarSkeletonProps {
    size?: number;
    haveRing?: boolean;
    rounded?: number;
    color?: string | null;
}

export const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({
    size = 36,
    haveRing = false,
    rounded = 99,
    color = null,
}) => {
    const hasPadding = haveRing || color;
    const innerSize = hasPadding ? size - 4 : size;

    return (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: rounded,
                    overflow: "hidden",
                },
                color ? { borderColor: color, borderWidth: 2 } : {},
                hasPadding && {
                    padding: 2,
                },
                haveRing && !color && {
                    borderWidth: 2,
                    borderColor: colors.system.blue,
                },
            ]}
        >
            <LinearGradient
                colors={["#C7C7CC", "#8E8E93"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                    borderRadius: rounded,
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                }}
            >
                <View style={StyleSheet.absoluteFill}>
                    <Skeleton
                        width={innerSize}
                        height={innerSize}
                        borderRadius={innerSize / 2}
                        style={{
                            opacity: 0.5,
                        }}
                    />
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
    },
});
