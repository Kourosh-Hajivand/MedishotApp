import TenstackProvider from "@/utils/Providers/TenstackProvider";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ToastManager from "toastify-react-native";
import "./global.css";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <TenstackProvider>
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen options={{ presentation: "modal" }} name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen options={{ presentation: "modal" }} name="(modals)" />
                </Stack>

                <StatusBar style={"dark"} animated backgroundColor={"#fff"} />
                <ToastManager />
            </TenstackProvider>
        </GestureHandlerRootView>
    );
}
