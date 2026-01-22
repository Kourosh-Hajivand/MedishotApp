import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "./Skeleton";
import colors from "@/theme/colors.shared";

interface ImageSkeletonProps {
    width?: number;
    height?: number;
    borderRadius?: number;
    variant?: "circular" | "rounded" | "rectangular";
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
    width = 100,
    height = 100,
    borderRadius = 8,
    variant = "rectangular",
}) => {
    return (
        <View style={styles.container}>
            <Skeleton
                width={width}
                height={height}
                borderRadius={variant === "circular" ? width / 2 : borderRadius}
                variant={variant}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.system.white,
    },
});
