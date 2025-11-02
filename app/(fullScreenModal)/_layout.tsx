import { BackButton } from "@/components";
import { router, Stack } from "expo-router";
import React from "react";

export default function FullScreenModalLayout() {
    return (
        <Stack screenOptions={{ headerTransparent: true }}>
            <Stack.Screen name="view-image" options={{ headerLeft: () => <BackButton onPress={() => router.back()} />, headerTitle: "" }} />
        </Stack>
    );
}
