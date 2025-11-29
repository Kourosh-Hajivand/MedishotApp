import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { BaseText } from "./text/BaseText";

// جلوگیری از بسته شدن خودکار splash screen
SplashScreen.preventAutoHideAsync();

interface AnimatedSplashScreenProps {
    onAnimationComplete?: () => void;
}

export function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
    const iconTranslateY = useSharedValue(0);
    const iconScale = useSharedValue(1.4); // ابتدا کمی کوچک‌تر
    const iconOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(30);

    useEffect(() => {
        // شروع انیمیشن - ایکون fade in می‌شود
        iconOpacity.value = withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.ease),
        });

        // ایکون کمی کوچک می‌شود و چند پیکسل به بالا می‌رود (یک بار)
        iconScale.value = withDelay(
            400,
            withTiming(1.2, {
                duration: 600,
                easing: Easing.out(Easing.ease),
            }),
        );

        iconTranslateY.value = withDelay(
            400,
            withTiming(-50, {
                duration: 600,
                easing: Easing.out(Easing.ease),
            }),
        );

        // متن فقط بعد از کوچک شدن ایکون (1000ms) با fade نرم ظاهر می‌شود
        textOpacity.value = withDelay(
            1000, // بعد از کوچک شدن ایکون
            withTiming(1, {
                duration: 800, // fade نرم‌تر
                easing: Easing.out(Easing.ease),
            }),
        );

        textTranslateY.value = withDelay(
            1000,
            withTiming(0, {
                duration: 800,
                easing: Easing.out(Easing.ease),
            }),
        );

        // بعد از اتمام انیمیشن، splash screen را مخفی کن
        const timer = setTimeout(async () => {
            await SplashScreen.hideAsync();
            onAnimationComplete?.();
        }, 2500); // 2.5 ثانیه - زمان مناسب برای انیمیشن

        return () => clearTimeout(timer);
    }, []);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: iconTranslateY.value }, { scale: iconScale.value }],
        opacity: iconOpacity.value,
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
                <Image source={require("@/assets/images/splash-icon.png")} style={styles.icon} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                <BaseText type="Title1" weight="600" color="system.black">
                    Medishots
                </BaseText>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
    },
    iconContainer: {
        position: "absolute",
        top: "50%",
        marginTop: -60, // نصف ارتفاع ایکون برای وسط قرار گیری
    },
    icon: {
        width: 150,
        height: 150,
    },
    textContainer: {
        position: "absolute",
        top: "50%",
        marginTop: 100, // زیر ایکون (50% + 100px)
    },
});
