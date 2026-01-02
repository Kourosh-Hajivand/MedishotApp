import { BackButton } from "@/components/button/ui/BackButton";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, useRouter } from "expo-router";
import React from "react";

export default function AuthLayout() {
    const router = useRouter();

    return (
        <BottomSheetModalProvider>
            <Stack
                screenOptions={{
                    headerShown: true,
                    headerLeft: () => <BackButton onPress={() => router.back()} />,
                    headerTitle: "",
                    headerShadowVisible: true,
                    headerTransparent: true,

                    headerStyle: {
                        backgroundColor: "transparent",
                    },
                }}
            >
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="select-role" />
                <Stack.Screen name="create-practice" />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="otp" />
                <Stack.Screen name="new-password" />
                <Stack.Screen name="complete-profile" />
            </Stack>
        </BottomSheetModalProvider>
    );
}
