import { BackButton } from "@/components";
import { router, Stack } from "expo-router";
import React from "react";

export default function AddPracticeMemberModalLayout() {
    return (
        <Stack screenOptions={{ presentation: "modal" }} initialRouteName="index">
            <Stack.Screen
                name="index"
                options={{
                    headerTitle: "",
                    headerTransparent: true,
                    headerLeft: () => <BackButton onPress={() => router.back()} />,
                    gestureEnabled: false,
                    fullScreenGestureEnabled: false,
                }}
            />
        </Stack>
    );
}
