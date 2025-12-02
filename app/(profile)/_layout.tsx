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
            <Stack.Screen
                name="index"
                options={{
                    headerTitle: "Profile",
                }}
            />
            <Stack.Screen
                name="practice-overview"
                options={{
                    headerTitle: "Practice Overview",
                }}
            />
            <Stack.Screen
                name="practice-team"
                options={{
                    headerTitle: "Practice Team",
                }}
            />
            <Stack.Screen
                name="practice-member-details"
                options={{
                    headerTitle: "",
                    headerLargeTitle: false,
                }}
            />
            <Stack.Screen
                name="print-information"
                options={{
                    headerTitle: "Print Information",
                }}
            />
            <Stack.Screen
                name="subscription"
                options={{
                    headerTitle: "Subscription",
                }}
            />
            <Stack.Screen
                name="notification"
                options={{
                    headerTitle: "Notification Settings",
                }}
            />
            <Stack.Screen
                name="archive"
                options={{
                    headerTitle: "Archive",
                }}
            />
            <Stack.Screen
                name="profile-detail"
                options={{
                    headerTitle: "Profile Details",
                }}
            />
        </Stack>
    );
}
