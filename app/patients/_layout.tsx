import { BackButton } from "@/components/button/ui/BackButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors.shared";
import { useGetPracticeList } from "@/utils/hook";
import { loadProfileSelection } from "@/utils/hook/useProfileStore";
import { BlurView } from "expo-blur";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import { Animated, TouchableOpacity } from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const blurValue = new Animated.Value(0);

export default function PatientsLayout() {
    const { data: practiceList } = useGetPracticeList();

    useEffect(() => {
        if (practiceList?.data && practiceList.data.length > 0) {
            loadProfileSelection(practiceList.data);
        }
    }, [practiceList?.data]);

    return (
        <Stack>
            <Stack.Screen
                name="[id]"
                options={{
                    headerTransparent: true,
                    headerTitleAlign: "center",
                    headerTintColor: "#000",
                    title: "",
                    headerRight: () => (
                        <TouchableOpacity className="flex-row px-2  justify-center items-center ">
                            <IconSymbol name="square.and.pencil" size={24} color={colors.system.blue} />
                        </TouchableOpacity>
                    ),
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
