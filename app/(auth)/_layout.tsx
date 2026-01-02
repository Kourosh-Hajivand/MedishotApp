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
                    gestureEnabled: false, // غیرفعال کردن gesture برای کل فلوی ثبت‌نام
                    fullScreenGestureEnabled: false,
                    headerStyle: {
                        backgroundColor: "transparent",
                    },
                }}
            >
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                <Stack.Screen name="select-role" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                <Stack.Screen name="create-practice" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="otp" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                <Stack.Screen name="new-password" />
                <Stack.Screen name="complete-profile" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
            </Stack>
        </BottomSheetModalProvider>
    );
}
