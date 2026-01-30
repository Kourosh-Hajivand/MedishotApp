import { BaseText } from "@/components";
import colors from "@/theme/colors";
import { Image } from "expo-image";
import React, { forwardRef } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import ViewShot, { ViewShot as ViewShotType } from "react-native-view-shot";
import { LayoutPattern } from "../create-template/types";
import { getCompositeLayoutStyle } from "./utils";

const { width } = Dimensions.get("window");

export type GhostItemData = {
    gostId: string;
    imageUrl?: string | null;
    rowIndex?: number;
    columnIndex?: number;
};

export type CompositePhoto = {
    id: string;
    uri: string;
    templateId: string;
};

interface CompositeLayoutProps {
    ghostItems: GhostItemData[];
    photos: CompositePhoto[];
    layoutPattern: LayoutPattern;
    containerWidth?: number;
    padding?: number;
    gap?: number;
    showDebugLabels?: boolean;
    onLayoutReady?: () => void;
}

export const CompositeLayout = forwardRef<ViewShotType, CompositeLayoutProps>(
    ({ ghostItems, photos, layoutPattern, containerWidth = width, padding = 10, gap = 10, showDebugLabels = __DEV__, onLayoutReady }, ref) => {
        // Filter to only include ghost items that have photos
        const itemsWithPhotos = ghostItems
            .map((ghostItem) => {
                const photo = photos.find((p) => p.templateId === ghostItem.gostId);
                return photo ? { ghostItem, photo } : null;
            })
            .filter((item): item is { ghostItem: GhostItemData; photo: CompositePhoto } => item !== null);

        return (
            <ViewShot
                ref={ref}
                style={[styles.compositeViewShot, { width: containerWidth, height: containerWidth }]}
                options={{ format: "jpg", quality: 1 }}
                onLayout={onLayoutReady}
            >
                <View style={[styles.compositeContainer, { width: containerWidth, height: containerWidth }]}>
                    {itemsWithPhotos.map(({ ghostItem, photo }, index) => {
                        const layoutStyle = getCompositeLayoutStyle(index, itemsWithPhotos.length, layoutPattern, containerWidth, padding, gap);

                        // Color palette for test images - always visible as background
                        const testColors = [
                            "#FF6B6B", // Red
                            "#4ECDC4", // Teal
                            "#45B7D1", // Blue
                            "#FFA07A", // Light Salmon
                            "#98D8C8", // Mint
                            "#F7DC6F", // Yellow
                            "#BB8FCE", // Purple
                            "#85C1E2", // Sky Blue
                            "#F8B739", // Orange
                        ];
                        const cellColor = testColors[index % testColors.length];

                        return (
                            <View key={ghostItem.gostId} style={[styles.compositeCell, layoutStyle, { backgroundColor: cellColor }]}>
                                {showDebugLabels && (
                                    <View style={styles.debugLabel}>
                                        <BaseText type="Caption2" color="labels.primary" style={{ fontSize: 8 }}>
                                            {index}: L:{Math.round(layoutStyle.left || 0)} T:{Math.round(layoutStyle.top || 0)} W:{Math.round(layoutStyle.width || 0)} H:{Math.round(layoutStyle.height || 0)}
                                        </BaseText>
                                    </View>
                                )}
                                <Image 
                                    source={{ uri: photo.uri }} 
                                    style={StyleSheet.absoluteFill} 
                                    contentFit="cover"
                                    transition={200}
                                />
                            </View>
                        );
                    })}
                </View>
            </ViewShot>
        );
    },
);

const styles = StyleSheet.create({
    compositeViewShot: {
        backgroundColor: colors.system.white,
    },
    compositeContainer: {
        backgroundColor: colors.system.white,
        position: "relative",
    },
    compositeCell: {
        position: "absolute",
        borderRadius: 8,
        overflow: "hidden",
    },
    debugLabel: {
        position: "absolute",
        top: 2,
        left: 2,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: 2,
        borderRadius: 2,
        zIndex: 10,
    },
});
