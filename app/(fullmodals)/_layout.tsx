import { Stack } from "expo-router";

export default function FullLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                gestureEnabled: false,
            }}
        >
            <Stack.Screen
                name="image-editor"
                options={{
                    presentation: "fullScreenModal",
                    animation: "fade",
                    contentStyle: { backgroundColor: "#000" },
                }}
            />
        </Stack>
    );
}
