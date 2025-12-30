import { BackButton } from "@/components/button/ui/BackButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors.shared";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Animated, TouchableOpacity } from "react-native";

export const blurValue = new Animated.Value(0);

export default function PatientsLayout() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <BottomSheetModalProvider>
            <Stack>
                <Stack.Screen
                    name="[id]"
                    options={{
                        headerTransparent: true,
                        headerTitleAlign: "center",
                        headerTintColor: "#000",
                        title: "",
                        headerShadowVisible: false,
                        headerRight: () => (
                            <TouchableOpacity
                                disabled={!id}
                                onPress={() => {
                                    router.push(`/(modals)/add-patient/photo?id=${id}`);
                                }}
                                className="flex-row px-2 justify-center items-center"
                            >
                                <IconSymbol name="square.and.pencil" size={24} color={colors.system.blue} />
                            </TouchableOpacity>
                        ),
                        headerLeft: () => <BackButton onPress={() => router.back()} />,
                        headerBackground: () => <AnimatedWhiteBackground />,
                    }}
                />
            </Stack>
        </BottomSheetModalProvider>
    );
}

function AnimatedWhiteBackground() {
    const backgroundOpacity = blurValue.interpolate({
        inputRange: [200, 240],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    return (
        <Animated.View
            style={{
                flex: 1,
                backgroundColor: "white",
                opacity: backgroundOpacity as any,
            }}
        />
    );
}
