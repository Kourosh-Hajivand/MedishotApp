import { IconSymbol } from "@/components/ui/icon-symbol";
import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import colors from "@/theme/colors";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { FadeIn, Layout, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { LayoutPattern, TemplateItem } from "./types";
import { getItemLayoutStyle } from "./utils";

const { width } = Dimensions.get("window");

interface PreviewCanvasProps {
    selectedItems: string[];
    templateItems: TemplateItem[];
    selectedLayout: LayoutPattern;
}

// Separate component for preview item to properly use hooks
const PreviewItem: React.FC<{
    item: TemplateItem;
    layoutStyle: any;
    index: number;
}> = ({ item, layoutStyle, index }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [itemDimensions, setItemDimensions] = useState({ width: 100, height: 100 });
    const hasLoadedRef = React.useRef(false); // Track if image has been loaded at least once
    const imageOpacity = useSharedValue(0);
    const skeletonOpacity = useSharedValue(1);

    const imageAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const handleLoad = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLoadStart = () => {
        // Only show skeleton if image hasn't been loaded before
        if (!hasLoadedRef.current) {
            setIsLoading(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    };

    const handleError = () => {
        hasLoadedRef.current = true;
        setIsLoading(false);
        skeletonOpacity.value = withTiming(0, { duration: 300 });
        imageOpacity.value = withTiming(1, { duration: 300 });
    };

    const handleLayout = (event: any) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        if (w > 0 && h > 0) {
            setItemDimensions({ width: w, height: h });
        }
    };

    // Check if image is from asset (not URL) - assets load immediately
    const isAssetImage = typeof item.image !== "string";
    
    // For asset images, start with skeleton visible
    React.useEffect(() => {
        if (isAssetImage && !hasLoadedRef.current) {
            // Asset images might load immediately, so we show skeleton initially
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    }, [isAssetImage]);

    return (
        <Animated.View layout={Layout.springify()} entering={FadeIn.delay(index * 50).springify()} style={[styles.previewItem, layoutStyle]} onLayout={handleLayout}>
            {(isLoading || skeletonOpacity.value > 0) && (
                <Animated.View style={[StyleSheet.absoluteFill, skeletonAnimatedStyle, { justifyContent: "center", alignItems: "center" }]}>
                    <ImageSkeleton width={itemDimensions.width} height={itemDimensions.height} borderRadius={0} variant="rectangular" />
                </Animated.View>
            )}
            <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle]}>
                <Image
                    source={typeof item.image === "string" ? { uri: item.image } : item.image}
                    style={styles.previewImage}
                    contentFit="contain"
                    onLoadStart={handleLoadStart}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            </Animated.View>
        </Animated.View>
    );
};

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
                        return <PreviewItem key={itemId} item={item} layoutStyle={layoutStyle} index={index} />;
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
