import { AuthGuard, AuthSplashScreen, TabletWrapper } from "@/components";
import { Layout } from "@/constants/theme";
import TenstackProvider from "@/utils/Providers/TenstackProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { enableScreens } from "react-native-screens";
import ToastManager from "toastify-react-native";
import "./global.css";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
    const [isSplashReady, setIsSplashReady] = useState(false);

    enableScreens(true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {!isSplashReady ? (
                <TenstackProvider>
                    <AuthSplashScreen onAuthReady={() => setIsSplashReady(true)} />
                </TenstackProvider>
            ) : (
                <BottomSheetModalProvider>
                    <TenstackProvider>
                        <AuthGuard>
                            <TabletWrapper maxWidth={Layout.TABLET_MAX_WIDTH} sideBackgroundColor={Layout.TABLET_SIDE_BACKGROUND}>
                                <Stack
                                    screenOptions={{
                                        headerShown: false,
                                    }}
                                >
                                <Stack.Screen name="index" />
                                <Stack.Screen options={{ presentation: "modal" }} name="(auth)" />
                                <Stack.Screen name="(tabs)" />
                                <Stack.Screen options={{ presentation: "modal" }} name="(modals)" />
                                <Stack.Screen options={{ presentation: "modal", gestureEnabled: false }} name="(modals)/add-patient" />
                                <Stack.Screen options={{ presentation: "modal" }} name="(modals)/add-practice-member" />
                                <Stack.Screen options={{ presentation: "modal" }} name="(fullmodals)" />
                                <Stack.Screen
                                    name="checkout"
                                    options={{
                                        presentation: "fullScreenModal",
                                        headerShown: false,
                                        gestureEnabled: false,
                                        animation: "fade",
                                    }}
                                />
                                <Stack.Screen name="patients" />
                                <Stack.Screen name="camera" />
                                <Stack.Screen options={{ presentation: "modal", animation: "slide_from_bottom" }} name="template-select-test" />
                                <Stack.Screen
                                    name="welcome"
                                    options={{
                                        gestureEnabled: false,
                                        fullScreenGestureEnabled: false,
                                        animation: "none",
                                        headerShown: false,
                                    }}
                                />
                                <Stack.Screen
                                    name="offline"
                                    options={{
                                        gestureEnabled: false,
                                        fullScreenGestureEnabled: false,
                                        animation: "fade",
                                        headerShown: false,
                                    }}
                                />
                                <Stack.Screen
                                    name="error"
                                    options={{
                                        gestureEnabled: false,
                                        fullScreenGestureEnabled: false,
                                        animation: "fade",
                                        headerShown: false,
                                    }}
                                />
                            </Stack>
                        </TabletWrapper>

                        <StatusBar style={"dark"} animated backgroundColor={"#fff"} />
                        <ToastManager />
                        </AuthGuard>
                    </TenstackProvider>
                </BottomSheetModalProvider>
            )}
        </GestureHandlerRootView>
    );
}
