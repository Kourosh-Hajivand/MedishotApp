import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { Image } from "expo-image";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { FadeIn, Layout } from "react-native-reanimated";
import { LayoutPattern, TemplateItem } from "./types";
import { getItemLayoutStyle } from "./utils";

const { width } = Dimensions.get("window");

interface PreviewCanvasProps {
    selectedItems: string[];
    templateItems: TemplateItem[];
    selectedLayout: LayoutPattern;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ selectedItems, templateItems, selectedLayout }) => {
    return (
        <View style={styles.previewBox}>
            {selectedItems.length === 0 ? (
                <View style={styles.previewPlaceholder}>
                    <View style={styles.previewPlaceholderIcon}>
                        <IconSymbol name="plus" size={32} color={colors.labels.quaternary} />
                    </View>
                </View>
            ) : (
                <>
                    {selectedItems.map((itemId, index) => {
                        const item = templateItems.find((i) => i.id === itemId);
                        if (!item) return null;
                        const layoutStyle = getItemLayoutStyle(index, selectedItems.length, selectedLayout);
                        return (
                            <Animated.View key={itemId} layout={Layout.springify()} entering={FadeIn.delay(index * 50).springify()} style={[styles.previewItem, layoutStyle]}>
                                <Image source={item.image} style={styles.previewImage} contentFit="contain" />
                            </Animated.View>
                        );
                    })}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    previewBox: {
        width: width - 40,
        height: (width - 40) * 0.92,
        borderWidth: 1,
        borderColor: colors.system.gray5,
        borderRadius: 16,
        overflow: "hidden",

        position: "relative",
    },
    previewPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
    },
    previewPlaceholderIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.system.white,
        justifyContent: "center",
        alignItems: "center",
    },
    previewItem: {
        alignItems: "center",
        justifyContent: "center",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
});
