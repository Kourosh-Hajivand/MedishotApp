import { ImageSkeleton } from "@/components/skeleton/ImageSkeleton";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";

export interface ThumbnailItemProps {
    imageUri: string;
    index: number;
    isActive: boolean;
    onPress: () => void;
    scrollProgress: ReturnType<typeof useSharedValue<number>>;
    currentIndexShared: ReturnType<typeof useSharedValue<number>>;
    isLoading?: boolean;
    onLoadStart?: () => void;
    onLoad?: () => void;
    onError?: () => void;
}

const ThumbnailItemComponent: React.FC<ThumbnailItemProps> = ({
    imageUri,
    index,
    isActive,
    onPress,
    scrollProgress,
    currentIndexShared,
    isLoading = true,
    onLoadStart,
    onLoad,
    onError,
}) => {
    const [showSkeleton, setShowSkeleton] = React.useState(isLoading);
    const thumbnailOpacity = useSharedValue(isLoading ? 0 : 1);
    const thumbnailSkeletonOpacity = useSharedValue(isLoading ? 1 : 0);
    const hasLoadedRef = React.useRef(false);

    const animatedThumbnailStyle = useAnimatedStyle(() => {
        const currentIdx = currentIndexShared.value;
        const distance = index - currentIdx;
        const progress = scrollProgress.value;

        let activeProgress = 0;

        if (distance === 0) {
            activeProgress = 1 - Math.abs(progress);
        } else if (distance === 1 && progress > 0) {
            activeProgress = progress;
        } else if (distance === -1 && progress < 0) {
            activeProgress = Math.abs(progress);
        }

        activeProgress = Math.max(0, Math.min(1, activeProgress));

        const w = 24 + activeProgress * 20;
        const margin = activeProgress * 6;
        const scale = 0.95 + activeProgress * 0.05;
        const opacity = 0.7 + activeProgress * 0.3;

        return {
            width: w,
            marginHorizontal: margin,
            transform: [{ scale }],
            opacity,
        };
    });

    const skeletonOpacityStyle = useAnimatedStyle(() => ({
        opacity: thumbnailSkeletonOpacity.value,
    }));

    const imageOpacityStyle = useAnimatedStyle(() => ({
        opacity: thumbnailOpacity.value,
    }));

    React.useEffect(() => {
        if (isLoading && !hasLoadedRef.current) {
            setShowSkeleton(true);
            thumbnailOpacity.value = 0;
            thumbnailSkeletonOpacity.value = 1;
        }
    }, [isLoading]);

    const hideSkeletonJS = () => {
        setShowSkeleton(false);
    };

    const handleLoadStart = () => {
        if (!hasLoadedRef.current) {
            setShowSkeleton(true);
            thumbnailOpacity.value = 0;
            thumbnailSkeletonOpacity.value = 1;
        }
        onLoadStart?.();
    };

    const handleLoad = () => {
        hasLoadedRef.current = true;
        thumbnailSkeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        thumbnailOpacity.value = withTiming(1, { duration: 300 });
        onLoad?.();
    };

    const handleError = () => {
        hasLoadedRef.current = true;
        thumbnailSkeletonOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(hideSkeletonJS)();
            }
        });
        thumbnailOpacity.value = withTiming(1, { duration: 300 });
        onError?.();
    };

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Animated.View style={[styles.thumbnail, animatedThumbnailStyle]}>
                {showSkeleton && (
                    <Animated.View style={[styles.thumbnailSkeletonContainer, skeletonOpacityStyle]}>
                        <ImageSkeleton width={44} height={44} borderRadius={8} variant="rounded" />
                    </Animated.View>
                )}
                <Animated.View style={imageOpacityStyle}>
                    <Image source={{ uri: imageUri }} style={styles.thumbnailImage} contentFit="cover" onLoadStart={handleLoadStart} onLoad={handleLoad} onError={handleError} />
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
};

export const ThumbnailItem = React.memo(ThumbnailItemComponent);

const styles = StyleSheet.create({
    thumbnail: {
        height: 44,
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 0,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    thumbnailSkeletonContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
});
