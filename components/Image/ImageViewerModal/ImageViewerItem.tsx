import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import type { Gesture } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

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

const ImageViewerItemComponent: React.FC<ImageViewerItemProps> = ({
    item,
    index,
    imageSize,
    gestures,
    isCurrentImage,
    imageAnimatedStyle,
    onLoadStart,
    onLoad,
    onError,
}) => {
    const imageOpacity = useSharedValue(0);

    const imageOpacityAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const handleLoadStart = () => {
        imageOpacity.value = 0;
        onLoadStart();
    };

    const handleLoad = (e: any) => {
        imageOpacity.value = withTiming(1, { duration: 300 });
        onLoad(e);
    };

    const handleError = () => {
        imageOpacity.value = withTiming(1, { duration: 300 });
        onError();
    };

    return (
        <View style={styles.imageWrapper} collapsable={false}>
            <GestureDetector gesture={gestures as any}>
                <Animated.View style={[styles.imageContainer, isCurrentImage ? imageAnimatedStyle : null] as any} collapsable={false}>
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
    image: {
        maxWidth: width,
        maxHeight: height,
    },
});
