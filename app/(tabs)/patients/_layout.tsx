import { BackButton } from "@/components/button/ui/BackButton";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import React from "react";
import { Animated } from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const blurValue = new Animated.Value(0);

export default function PatientsLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                    headerLargeTitle: false,
                    // headerLargeTitle: true
                    title: "",
                    headerTransparent: true,
                    // headerTintColor: "#000",
                    // headerSearchBarOptions: {
                    //     placeholder: "Search patients",
                    //     hideWhenScrolling: false,
                    //     onChangeText: ({ nativeEvent }) => {
                    //         console.log("search:", nativeEvent.text);
                    //     },
                    // },
                }}
            />

            <Stack.Screen
                name="[id]"
                options={{
                    headerTransparent: true,
                    headerTitleAlign: "center",
                    headerTintColor: "#000",
                    title: "",
                    headerLeft: () => <BackButton onPress={() => router.back()} />,
                    headerBackground: () => <AnimatedBlurBackground />,
                }}
            />
        </Stack>
    );
}

function AnimatedBlurBackground() {
    const animatedIntensity = blurValue.interpolate({
        inputRange: [60, 140],
        outputRange: [0, 80],
        extrapolate: "clamp",
    });

    return (
        <AnimatedBlurView
            intensity={animatedIntensity as any}
            tint="light"
            style={{
                flex: 1,

                borderBottomColor: "rgba(0,0,0,0.15)",
            }}
        />
    );
}
