import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import type { Gesture } from "react-native-gesture-handler";
import colors from "@/theme/colors";

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
    isLoading,
    onLoadStart,
    onLoad,
    onError,
}) => {
    const [showSkeleton, setShowSkeleton] = React.useState(isLoading);
    const imageOpacity = useSharedValue(isLoading ? 0 : 1);
    const skeletonOpacity = useSharedValue(isLoading ? 1 : 0);
    const hasLoadedRef = React.useRef(false);

    const skeletonAnimatedStyle = useAnimatedStyle(() => ({
        opacity: skeletonOpacity.value,
    }));

    const imageOpacityAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    React.useEffect(() => {
        if (isLoading && !hasLoadedRef.current) {
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
    }, [isLoading]);

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    const handleLoadStart = () => {
        if (!hasLoadedRef.current) {
            setShowSkeleton(true);
            imageOpacity.value = 0;
            skeletonOpacity.value = 1;
        }
        onLoadStart();
    };

    const handleLoad = (e: any) => {
        hasLoadedRef.current = true;
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
        onLoad(e);
    };

    const handleError = () => {
        hasLoadedRef.current = true;
        skeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        imageOpacity.value = withTiming(1, { duration: 300 });
        onError();
    };

    return (
        <View style={styles.imageWrapper} collapsable={false}>
            <GestureDetector gesture={gestures as any}>
                <Animated.View style={[styles.imageContainer, isCurrentImage ? imageAnimatedStyle : null] as any} collapsable={false}>
                    {showSkeleton && (
                        <Animated.View style={[styles.skeletonContainer, { width: imageSize.width || width, height: imageSize.height || height }, skeletonAnimatedStyle]}>
                            <ImageSkeleton width={imageSize.width || width} height={imageSize.height || height} borderRadius={0} variant="rectangular" />
                        </Animated.View>
                    )}
                    <Animated.View style={imageOpacityAnimatedStyle}>
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
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        maxWidth: width,
        maxHeight: height,
    },
    skeletonContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.system.black,
    },
});
