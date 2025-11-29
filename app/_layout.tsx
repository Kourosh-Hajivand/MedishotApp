import { TabletWrapper, AnimatedSplashScreen } from "@/components";
import { Layout } from "@/constants/theme";
import TenstackProvider from "@/utils/Providers/TenstackProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { enableScreens } from "react-native-screens";
import ToastManager from "toastify-react-native";
import { useState } from "react";
import "./global.css";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
    const [isSplashReady, setIsSplashReady] = useState(false);

    enableScreens(true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {!isSplashReady ? (
                <AnimatedSplashScreen
                    onAnimationComplete={() => setIsSplashReady(true)}
                />
            ) : (
                <BottomSheetModalProvider>
                    <TenstackProvider>
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
                                <Stack.Screen options={{ presentation: "modal" }} name="(fullmodals)" />
                                <Stack.Screen name="patients" />
                            </Stack>
                        </TabletWrapper>

                        <StatusBar style={"dark"} animated backgroundColor={"#fff"} />
                        <ToastManager />
                    </TenstackProvider>
                </BottomSheetModalProvider>
            )}
        </GestureHandlerRootView>
    );
}
