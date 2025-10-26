import { BackButton } from "@/components/button/ui/BackButton";
import { router, Stack } from "expo-router";
import React from "react";

export default function AddPatientModalLayout() {
    return (
        <Stack screenOptions={{ presentation: "modal" }}>
            <Stack.Screen name="form" options={{ headerTitle: "Add New Patient", headerShown: false }} />
            <Stack.Screen name="photo" options={{ headerTitle: "Add New Patient", headerLeft: () => <BackButton onPress={() => router.back()} />, headerShadowVisible: true, headerTransparent: true, headerStyle: { backgroundColor: "transparent" } }} />
            <Stack.Screen name="review" options={{ headerTitle: "Review Patient" }} />
            <Stack.Screen name="select-label" options={{ headerTitle: "Label", presentation: "modal", headerLeft: () => <BackButton onPress={() => router.back()} />, headerShadowVisible: true, headerTransparent: true, headerStyle: { backgroundColor: "transparent" } }} />
            <Stack.Screen name="select-country" options={{ headerTitle: "Country or Region", presentation: "modal", headerLeft: () => <BackButton onPress={() => router.back()} />, headerShadowVisible: true, headerTransparent: true, headerStyle: { backgroundColor: "transparent" } }} />
        </Stack>
    );
}
