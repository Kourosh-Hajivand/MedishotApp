import { Stack } from "expo-router";
import React from "react";

export default function ModalsLayout() {
    return (
        <Stack screenOptions={{ presentation: "modal", headerTransparent: true }}>
            <Stack.Screen name="select-date" />
            <Stack.Screen name="select-gender" />
            <Stack.Screen name="add-patient" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
    );
}
