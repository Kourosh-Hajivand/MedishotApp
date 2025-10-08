import { Stack } from "expo-router";
import React from "react";

export default function AddPatientModalLayout() {
    return (
        <Stack screenOptions={{ presentation: "pageSheet" }}>
            <Stack.Screen name="form" options={{ headerTitle: "Add New Patient" }} />
            <Stack.Screen name="photo" options={{ headerTitle: "Add Photo" }} />
            <Stack.Screen name="review" options={{ headerTitle: "Review Patient" }} />
        </Stack>
    );
}
