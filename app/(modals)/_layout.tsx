import { Stack } from "expo-router";
import React from "react";

export default function ModalsLayout() {
    return (
        <Stack screenOptions={{ presentation: "modal", headerTransparent: true }}>
            <Stack.Screen name="select-date" />
            <Stack.Screen name="select-gender" />
            <Stack.Screen name="select-contract" options={{ title: "Select Consent", headerShown: true, headerTransparent: true }} />
            <Stack.Screen name="add-patient" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="add-practice-member" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="edit-practice" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
    );
}
