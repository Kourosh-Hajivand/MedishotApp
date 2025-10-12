import { BackButton } from "@/components/button/ui/BackButton";
import { router, Stack } from "expo-router";
import React from "react";

export default function layout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerLeft: () => <BackButton onPress={() => router.back()} />,
                headerTitle: "",
                headerShadowVisible: true,
                headerTransparent: true,
                // presentation: "transparentModal",
                headerStyle: {
                    backgroundColor: "transparent",
                },
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}
