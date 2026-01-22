import colors from "@/theme/colors.shared";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { DimensionValue, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
    variant?: "circular" | "rectangular" | "rounded";
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = "100%",
    height = 20,
    borderRadius = 4,
    style,
    variant = "rectangular",
}) => {
    const shimmerTranslateX = useSharedValue(-200);

    useEffect(() => {
        shimmerTranslateX.value = withRepeat(
            withTiming(200, {
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shimmerTranslateX.value }],
        };
    });

    const getBorderRadius = () => {
        switch (variant) {
            case "circular":
                return typeof height === "number" ? height / 2 : borderRadius;
            case "rounded":
                return borderRadius;
            case "rectangular":
            default:
                return borderRadius;
        }
    };

    return (
        <View
            style={[
                {
                    width: width as DimensionValue,
                    height: height as DimensionValue,
                    borderRadius: getBorderRadius(),
                    backgroundColor: colors.system.gray5,
                    overflow: "hidden",
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "200%",
                    },
                    animatedStyle,
                ]}
            >
                <LinearGradient
                    colors={[
                        "transparent",
                        "rgba(255, 255, 255, 0.4)",
                        "rgba(255, 255, 255, 0.8)",
                        "rgba(255, 255, 255, 0.4)",
                        "transparent",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    locations={[0, 0.4, 0.5, 0.6, 1]}
                    style={{
                        width: "100%",
                        height: "100%",
                    }}
                />
            </Animated.View>
        </View>
    );
};
