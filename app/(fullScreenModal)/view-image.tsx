import { BaseText } from "@/components";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ViewImageScreen() {
    const params = useLocalSearchParams<{
        imageUri?: string | string[];
        images?: string;
        initialIndex?: string;
    }>();
    const [images, setImages] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        let imagesList: string[] = [];
        let initialIndex = 0;

        // اگر لیست تصاویر پاس داده شده باشد
        if (params.images) {
            try {
                imagesList = JSON.parse(params.images);
                initialIndex = params.initialIndex ? parseInt(params.initialIndex, 10) : 0;
            } catch (e) {
                console.error("Error parsing images:", e);
            }
        }
        // اگر فقط یک تصویر پاس داده شده باشد
        else if (params.imageUri) {
            const uri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
            imagesList = [decodeURIComponent(uri)];
            initialIndex = 0;
        }

        if (imagesList.length === 0) {
            setTimeout(() => router.back(), 200);
            return;
        }

        setImages(imagesList);
        setCurrentIndex(initialIndex);

        // اسکرول به تصویر اولیه
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
        }, 100);
    }, [params.imageUri, params.images, params.initialIndex]);

    const handleClose = () => router.back();

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            if (index !== null && index !== undefined) {
                setCurrentIndex(index);
            }
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    // کامپوننت برای هر تصویر
    const ImageItem = ({ uri, index }: { uri: string; index: number }) => {
        const scale = useSharedValue(1);
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const [imageSize, setImageSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

        // ابعاد تصویر
        const handleImageLoad = (event: any) => {
            const width = event?.source?.width || event?.nativeEvent?.source?.width || SCREEN_WIDTH;
            const height = event?.source?.height || event?.nativeEvent?.source?.height || SCREEN_HEIGHT;

            const ratio = width / height;
            const screenRatio = SCREEN_WIDTH / SCREEN_HEIGHT;

            let w = SCREEN_WIDTH;
            let h = SCREEN_HEIGHT;
            if (ratio > screenRatio) h = SCREEN_WIDTH / ratio;
            else w = SCREEN_HEIGHT * ratio;
            setImageSize({ width: w, height: h });
        };

        // gesture logic
        const savedScale = useSharedValue(1);
        const savedTranslateX = useSharedValue(0);
        const savedTranslateY = useSharedValue(0);

        const pinch = Gesture.Pinch()
            .onStart(() => {
                savedScale.value = scale.value;
            })
            .onUpdate((e) => {
                scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
            });

        const pan = Gesture.Pan()
            .onStart(() => {
                savedTranslateX.value = translateX.value;
                savedTranslateY.value = translateY.value;
            })
            .onUpdate((e) => {
                if (scale.value > 1) {
                    translateX.value = savedTranslateX.value + e.translationX;
                    translateY.value = savedTranslateY.value + e.translationY;
                }
            })
            .maxPointers(1);

        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd(() => {
                if (scale.value > 1) {
                    scale.value = withSpring(1);
                    translateX.value = withSpring(0);
                    translateY.value = withSpring(0);
                } else {
                    scale.value = withSpring(2);
                }
            });

        const singleTap = Gesture.Tap()
            .numberOfTaps(1)
            .maxDuration(250)
            .onEnd(() => {
                if (scale.value === 1) runOnJS(handleClose)();
            });

        // فقط pinch و pan را با هم ترکیب کن، تا swipe افقی FlatList کار کند
        const composed = Gesture.Simultaneous(Gesture.Simultaneous(pinch, pan), Gesture.Race(doubleTap, singleTap));

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }, { translateX: translateX.value }, { translateY: translateY.value }],
        }));

        return (
            <View style={styles.imageWrapper}>
                <GestureDetector gesture={composed}>
                    <Animated.View style={[styles.imageContainer, animatedStyle]}>
                        <Image source={{ uri }} onLoad={handleImageLoad} style={{ width: imageSize.width, height: imageSize.height }} contentFit="contain" />
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    };

    if (images.length === 0) return null;

    return (
        <GestureHandlerRootView style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item, index }) => <ImageItem uri={item} index={index} />}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                initialScrollIndex={currentIndex}
            />

            {/* شماره تصویر فعلی */}
            {images.length > 1 && (
                <View style={styles.counter}>
                    <View style={styles.counterBg}>
                        <BaseText type="Caption1" style={{ color: "white" }}>
                            {currentIndex + 1} / {images.length}
                        </BaseText>
                    </View>
                </View>
            )}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
    },
    imageWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    counter: {
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
    },
    counterBg: {
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
});
