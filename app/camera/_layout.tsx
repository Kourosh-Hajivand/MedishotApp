import { Stack } from "expo-router";

export default function CameraLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade",
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    animation: "slide_from_right",
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
                name="select-ghost-items"
                options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                }}
            />
            <Stack.Screen
                name="review"
                options={{
                    animation: "slide_from_right",
                }}
            />
        </Stack>
    );
}

