import { Skeleton } from "@/components/skeleton/Skeleton";
import { Image } from "expo-image";
import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import type { Gesture } from "react-native-gesture-handler";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

/** ابعاد باکس لودینگ وسط با نسبت ۳:۲ (width : height) */
function getLoadingBoxSize(): { boxWidth: number; boxHeight: number } {
    const ratio = 2 / 3;
    let boxWidth = width;
    let boxHeight = width / ratio;
    if (boxHeight > height) {
        boxHeight = height;
        boxWidth = height * ratio;
    }
    return { boxWidth, boxHeight };
}

export interface ImageViewerItemProps {
    item: string;
    index: number;
    imageSize: { width: number; height: number };
    gestures: ReturnType<typeof Gesture.Simultaneous> | ReturnType<typeof Gesture.Tap>;
    isCurrentImage: boolean;
    imageAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
    isLoading: boolean;
    onLoadStart: () => void;
    onLoad: (e: any) => void;
    onError: () => void;
}

const ImageViewerItemComponent: React.FC<ImageViewerItemProps> = ({ item, index, imageSize, gestures, isCurrentImage, imageAnimatedStyle, isLoading, onLoadStart, onLoad, onError }) => {
    const imageOpacity = useSharedValue(isLoading ? 0 : 1);
    const skeletonOpacity = useSharedValue(isLoading ? 1 : 0);

    const loadingBoxSize = useMemo(getLoadingBoxSize, []);

    useEffect(() => {
        if (isLoading) {
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        } else {
            skeletonOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [isLoading]);

    const imageOpacityAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const handleLoadStart = () => {
        imageOpacity.value = 0;
        onLoadStart();
    };

    const handleLoad = (e: any) => {
        if (isLoading) return;
        imageOpacity.value = withTiming(1, { duration: 300 });
        onLoad(e);
    };

    const handleError = () => {
        if (isLoading) return;
        imageOpacity.value = withTiming(1, { duration: 300 });
        onError();
    };

    return (
        <View style={styles.imageWrapper} collapsable={false}>
            <GestureDetector gesture={gestures as any}>
                <Animated.View style={[styles.imageContainer, isCurrentImage ? imageAnimatedStyle : null] as any} collapsable={false}>
                    {isLoading && (
                        <Animated.View style={[StyleSheet.absoluteFill, styles.skeletonOuter, skeletonAnimatedStyle]} pointerEvents="none">
                            <View style={[styles.skeletonBox3x2, { width: loadingBoxSize.boxWidth, height: loadingBoxSize.boxHeight }]}>
                                <Skeleton width={loadingBoxSize.boxWidth} height={loadingBoxSize.boxHeight} borderRadius={8} variant="rounded" />
                            </View>
                        </Animated.View>
                    )}
                    <Animated.View style={[styles.imageOpacityWrapper, imageOpacityAnimatedStyle]}>
                        <Image
                            source={{ uri: item }}
                            style={[
                                styles.image,
                                imageSize.width > 0 && {
                                    width: imageSize.width,
                                    height: imageSize.height,
                                },
                            ]}
                            contentFit="contain"
                            onLoadStart={handleLoadStart}
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

export const ImageViewerItem = React.memo(ImageViewerItemComponent);

const styles = StyleSheet.create({
    imageWrapper: {
        width,
        height,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    imageOpacityWrapper: {
        backgroundColor: "#000",
    },
    skeletonOuter: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    skeletonBox3x2: {
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: 8,
    },
    image: {
        maxWidth: width,
        maxHeight: height,
    },
});
