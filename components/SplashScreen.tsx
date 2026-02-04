import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

SplashScreen.preventAutoHideAsync();

interface AnimatedSplashScreenProps {
    onAnimationComplete?: () => void;
}

export function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Simple fade in animation
        opacity.value = withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.ease),
        });

        const timer = setTimeout(async () => {
            await SplashScreen.hideAsync();
            onAnimationComplete?.();
        }, 600);

        return () => clearTimeout(timer);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={styles.container} exiting={FadeOut.duration(300)}>
            <Animated.View style={animatedStyle}>
                <Image source={require("@/assets/images/splash-icon.png")} style={styles.icon} resizeMode="contain" />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
    },
    icon: {
        width: 150,
        height: 150,
    },
});
