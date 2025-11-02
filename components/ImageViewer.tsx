import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageViewerProps {
    visible: boolean;
    imageUri: string;
    onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ visible, imageUri, onClose }) => {
    const insets = useSafeAreaInsets();
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    // مقادیر انیمیشن
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const backdropOpacity = useSharedValue(0);

    // انیمیشن modal
    React.useEffect(() => {
        if (visible) {
            opacity.value = withSpring(1, { damping: 20, stiffness: 90 });
            backdropOpacity.value = withTiming(1, { duration: 300 });
            scale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            backdropOpacity.value = withTiming(0, { duration: 200 });
            scale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
        }
    }, [visible]);

    // محاسبه ابعاد تصویر
    const handleImageLoad = (event: any) => {
        // expo-image ممکن است format های مختلفی داشته باشد
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
            // اگر ابعاد مشخص نشد، از ابعاد پیش‌فرض استفاده کن
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
                // محدود کردن حرکت به محدوده تصویر
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
                // اگر scale = 1 باشد، reset به مرکز
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

    const composedGesture = Gesture.Simultaneous(
        Gesture.Simultaneous(pinchGesture, panGesture),
        doubleTapGesture
    );

    // استایل انیمیشن تصویر
    const imageAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { translateX: translateX.value },
                { translateY: translateY.value },
            ],
        };
    });

    // استایل انیمیشن backdrop
    const backdropAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: backdropOpacity.value,
        };
    });

    // استایل انیمیشن محتوا
    const contentAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const handleClose = () => {
        opacity.value = withTiming(0, { duration: 200 });
        backdropOpacity.value = withTiming(0, { duration: 200 });
        scale.value = withSpring(1, { damping: 20 });
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        setTimeout(() => {
            runOnJS(onClose)();
        }, 200);
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <GestureHandlerRootView style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Content */}
                <Animated.View style={[styles.content, contentAnimatedStyle]}>
                    <GestureDetector gesture={composedGesture}>
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
                    </GestureDetector>

                    {/* دکمه بستن */}
                    <Pressable style={[styles.closeButton, { top: insets.top + 16 }]} onPress={handleClose}>
                        <View style={styles.closeButtonInner}>
                            <MaterialIcons name="close" size={24} color="#FFFFFF" />
                        </View>
                    </Pressable>
                </Animated.View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
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

