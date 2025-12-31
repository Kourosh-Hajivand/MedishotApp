import { BaseText } from "@/components";
import { router, Stack } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";

export default function ModalsLayout() {
    return (
        <Stack screenOptions={{ presentation: "modal", headerTransparent: true }}>
            <Stack.Screen name="select-date" />
            <Stack.Screen name="select-gender" />
            <Stack.Screen
                name="select-contract"
                options={{
                    title: "Select Consent",
                    headerShown: true,
                    headerTransparent: true,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="px-4 py-2">
                            <BaseText type="Body" color="system.blue">
                                Close
                            </BaseText>
                        </TouchableOpacity>
                    ),
                }}
            />

            <Stack.Screen name="add-patient" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="add-practice-member" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="edit-practice" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
    );
}
