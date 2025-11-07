import { Stack } from "expo-router";

export default function FullLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="image-editor"
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    presentation: "fullScreenModal",
                    animation: "fade",
                    contentStyle: { backgroundColor: "#000" },
                }}
            />
        </Stack>
    );
}
