import { BackButton } from "@/components/button/ui/BackButton";
import { router, Stack } from "expo-router";
import React from "react";

export default function AddPatientModalLayout() {
    return (
        <Stack>
            <Stack.Screen name="form" options={{ headerTitle: "Add New Patient", headerLeft: () => <BackButton onPress={() => router.back()} />, headerShadowVisible: true, headerTransparent: true, headerStyle: { backgroundColor: "transparent" } }} />
            <Stack.Screen name="photo" options={{ headerTitle: "Add New Patient", headerLeft: () => <BackButton onPress={() => router.back()} />, headerShadowVisible: true, headerTransparent: true, headerStyle: { backgroundColor: "transparent" } }} />
            <Stack.Screen name="review" options={{ headerTitle: "Review Patient" }} />
        </Stack>
    );
}
