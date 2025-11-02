import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ViewImageScreen() {
    const params = useLocalSearchParams<{ imageUri: string }>();
    const insets = useSafeAreaInsets();
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    const imageUri = params.imageUri;

    if (!imageUri) {
        router.back();
        return null;
    }

    // مقادیر انیمیشن
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // محاسبه ابعاد تصویر
    const handleImageLoad = (event: any) => {
        let width = 0;
        let height = 0;

        if (event?.source?.width && event?.source?.height) {
            width = event.source.width;
            height = event.source.height;
        } else if (event?.nativeEvent?.source?.width && event?.nativeEvent?.source?.height) {
            width = event.nativeEvent.source.width;
            height = event.nativeEvent.source.height;
        }

        if (width && height) {
            const imageAspectRatio = width / height;
            const screenAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;

            let displayWidth = SCREEN_WIDTH;
            let displayHeight = SCREEN_HEIGHT;

            if (imageAspectRatio > screenAspectRatio) {
                displayHeight = SCREEN_WIDTH / imageAspectRatio;
            } else {
                displayWidth = SCREEN_HEIGHT * imageAspectRatio;
            }

            setImageSize({ width: displayWidth, height: displayHeight });
        } else {
            setImageSize({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        }
    };

    // Gesture برای zoom و pan
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            scale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
            }
            if (scale.value > 4) {
                scale.value = withSpring(4);
            }
        });

    const panGesture = Gesture.Pan()
        .enabled(true)
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
        .onEnd(() => {
            if (scale.value > 1 && imageSize.width > 0 && imageSize.height > 0) {
                const scaledWidth = imageSize.width * scale.value;
                const scaledHeight = imageSize.height * scale.value;
                const maxTranslateX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
                const maxTranslateY = Math.max(0, (scaledHeight - SCREEN_HEIGHT) / 2);

                if (maxTranslateX > 0 && Math.abs(translateX.value) > maxTranslateX) {
                    translateX.value = withSpring(Math.sign(translateX.value) * maxTranslateX);
                } else if (Math.abs(translateX.value) > SCREEN_WIDTH / 2) {
                    translateX.value = withSpring(0);
                }

                if (maxTranslateY > 0 && Math.abs(translateY.value) > maxTranslateY) {
                    translateY.value = withSpring(Math.sign(translateY.value) * maxTranslateY);
                } else if (Math.abs(translateY.value) > SCREEN_HEIGHT / 2) {
                    translateY.value = withSpring(0);
                }
            } else {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        });

    const doubleTapGesture = Gesture.Tap()
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

    const singleTapGesture = Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(250)
        .onEnd(() => {
            // فقط وقتی scale = 1 باشد و روی عکس کلیک نشده باشد، بسته شود
            if (scale.value === 1) {
                runOnJS(handleClose)();
            }
        });

    const composedGesture = Gesture.Simultaneous(Gesture.Simultaneous(pinchGesture, panGesture), Gesture.Race(doubleTapGesture, singleTapGesture));

    // استایل انیمیشن تصویر
    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { translateX: translateX.value }, { translateY: translateY.value }],
        };
    });

    const handleClose = () => {
        router.back();
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={composedGesture}>
                <View style={styles.content}>
                    <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
                        <Image
                            source={{ uri: imageUri }}
                            style={[
                                styles.image,
                                imageSize.width > 0 && {
                                    width: imageSize.width,
                                    height: imageSize.height,
                                },
                            ]}
                            contentFit="contain"
                            onLoad={handleImageLoad}
                        />
                    </Animated.View>
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: "rgba(0, 0, 0, 0.95)",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        maxWidth: SCREEN_WIDTH,
        maxHeight: SCREEN_HEIGHT,
    },
    closeButton: {
        position: "absolute",
        right: 16,
        zIndex: 10,
    },
    closeButtonInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
});
