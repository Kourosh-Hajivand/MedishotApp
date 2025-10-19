import { BackButton } from "@/components/button/ui/BackButton";
import { router, Stack } from "expo-router";
import React from "react";

export default function Layout() {
    return (
        <Stack>
            <Stack.Screen
                name="[id]"
                options={{
                    headerTitle: "",
                    headerTransparent: true,

                    headerLeft: () => <BackButton onPress={() => router.back()} />,
                }}
            />
        </Stack>
    );
}
