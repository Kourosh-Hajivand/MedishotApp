import TenstackProvider from "@/utils/Providers/TenstackProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { enableScreens } from "react-native-screens";
import ToastManager from "toastify-react-native";
import "./global.css";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
    enableScreens(true);
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
                <TenstackProvider>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                        }}
                    >
                        <Stack.Screen name="index" />
                        <Stack.Screen options={{ presentation: "modal" }} name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen options={{ presentation: "modal" }} name="(modals)/add-patient" />
                    </Stack>

                    <StatusBar style={"dark"} animated backgroundColor={"#fff"} />
                    <ToastManager />
                </TenstackProvider>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    );
}
