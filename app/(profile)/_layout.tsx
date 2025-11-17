import { BackButton } from "@/components/button/ui/BackButton";
import { router, Stack } from "expo-router";
import React from "react";

export default function layout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerLeft: () => <BackButton onPress={() => router.back()} />,
                headerTitle: "Profile",
                headerShadowVisible: true,
                headerTransparent: true,
                headerLargeTitle: true,
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}
