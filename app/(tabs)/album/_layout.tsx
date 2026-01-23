import { Stack } from "expo-router";
import React from "react";

export default function AlbumLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerTitle: "Practice Album",
                    headerLargeTitle: false,
                    headerTransparent: false,
                    headerShadowVisible: true,
                }}
            />
        </Stack>
    );
}
