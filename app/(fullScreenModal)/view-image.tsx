import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ViewImageScreen() {
    const params = useLocalSearchParams<{ imageUri: string | string[] }>();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageSize, setImageSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

    useEffect(() => {
        const uri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
        if (uri) {
            setImageUri(decodeURIComponent(uri));
        } else {
            setTimeout(() => router.back(), 200);
        }
    }, [params.imageUri]);

    // انیمیشن‌ها
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

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
        });

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

    const composed = Gesture.Simultaneous(Gesture.Simultaneous(pinch, pan), Gesture.Race(doubleTap, singleTap));

    const handleClose = () => router.back();

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: translateX.value }, { translateY: translateY.value }],
    }));

    if (!imageUri) return null;

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={composed}>
                <View style={styles.content}>
                    <Animated.View style={[styles.imageContainer, animatedStyle]}>
                        <Image source={{ uri: imageUri }} onLoad={handleImageLoad} style={{ width: imageSize.width, height: imageSize.height }} contentFit="contain" />
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Toolbar پایین */}
            {/* <BlurView intensity={60} tint="dark" style={styles.bottomBar}>
                <TouchableOpacity onPress={handleClose}>
                    <IconSymbol name="xmark.circle.fill" color={colors.system.gray3} size={30} />
                </TouchableOpacity>
                <TouchableOpacity>
                    <IconSymbol name="heart" color={colors.system.red} size={30} />
                </TouchableOpacity>
                <TouchableOpacity>
                    <IconSymbol name="info.circle" color={colors.system.blue} size={30} />
                </TouchableOpacity>
            </BlurView> */}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
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
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        borderTopWidth: 0.5,
        borderColor: "rgba(255,255,255,0.1)",
    },
});
