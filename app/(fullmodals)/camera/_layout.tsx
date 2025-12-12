import { Stack } from "expo-router";

export default function CameraLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade",
                gestureEnabled: false,
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    presentation: "fullScreenModal",
                }}
            />
            <Stack.Screen
                name="template-select"
                options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                }}
            />
            <Stack.Screen
                name="create-template"
                options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                }}
            />
            <Stack.Screen
                name="capture"
                options={{
                    presentation: "fullScreenModal",
                    animation: "fade",
                }}
            />
            <Stack.Screen
                name="review"
                options={{
                    presentation: "fullScreenModal",
                    animation: "slide_from_right",
                }}
            />
        </Stack>
    );
}
