import { BaseButton, BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import { useNetworkStatus } from "@/utils/hook";
import { router, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OfflineScreen() {
    const insets = useSafeAreaInsets();
    const [isRetrying, setIsRetrying] = useState(false);
    const { isOffline } = useNetworkStatus();
    const segments = useSegments();

    const navigateAway = () => {
        try {
            if (typeof router.canGoBack === "function" && router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)/patients");
            }
        } catch (error) {
            router.replace("/(tabs)/patients");
        }
    };

    useEffect(() => {
        const isOnOfflinePage = segments.some((segment) => segment === "offline");
        if (!isOffline && isOnOfflinePage) {
            const timer = setTimeout(() => {
                navigateAway();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOffline, segments]);

    const handleRetry = async () => {
        setIsRetrying(true);
        
        const checkNetwork = async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            if (!isOffline) {
                navigateAway();
            } else {
                setIsRetrying(false);
            }
        };

        await checkNetwork();
        
        setTimeout(() => {
            if (isRetrying) {
                setIsRetrying(false);
            }
        }, 2000);
    };

    return (
        <ScrollView 
            style={[styles.container, { paddingTop: insets.top }]} 
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing["6"] }]} 
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <IconSymbol name="wifi.slash" size={64} color="system.gray" />
                </View>

                <BaseText type="Title1" weight="700" color="labels.primary" style={styles.title}>
                    No Internet Connection
                </BaseText>

                <BaseText type="Body" weight="400" color="labels.secondary" style={styles.description}>
                    Please check your internet connection and try again.
                </BaseText>

                <View style={styles.buttonContainer}>
                    <BaseButton 
                        label={isRetrying ? "Checking..." : "Retry"} 
                        onPress={handleRetry} 
                        ButtonStyle="Filled" 
                        size="Large" 
                        rounded 
                        style={styles.button} 
                        disabled={isRetrying} 
                        isLoading={isRetrying} 
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing["4"],
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
    },
    iconContainer: {
        paddingTop: spacing["6"],
        marginBottom: spacing["6"],
    },
    title: {
        fontSize: 28,
        lineHeight: 34,
        marginBottom: spacing["2"],
        textAlign: "center",
    },
    description: {
        fontSize: 17,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: spacing["6"],
        paddingHorizontal: spacing["4"],
    },
    buttonContainer: {
        width: "100%",
        gap: spacing["3"],
    },
    button: {
        width: "100%",
    },
});
