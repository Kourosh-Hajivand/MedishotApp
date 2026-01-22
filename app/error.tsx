import { BaseButton, BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import axiosInstance from "@/utils/AxiosInstans";
import { clearFailedRequest, FailedRequest, getFailedRequest } from "@/utils/helper/failedRequestStorage";
import { getTokens } from "@/utils/helper/tokenStorage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ErrorScreen() {
    const insets = useSafeAreaInsets();
    const [isRetrying, setIsRetrying] = useState(false);
    const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);

    // Check if user has token
    const checkAuthAndNavigate = async (targetRoute: () => void) => {
        try {
            const tokens = await getTokens();
            if (!tokens?.accessToken) {
                // No token, redirect to welcome
                router.replace("/welcome");
                return;
            }
            // Has token, proceed with navigation
            targetRoute();
        } catch (error) {
            // Error getting tokens, redirect to welcome
            router.replace("/welcome");
        }
    };

    useEffect(() => {
        // Load failed request on mount
        getFailedRequest().then((request) => {
            setFailedRequest(request);
        });

        // Check authentication on mount - if no token, redirect to welcome
        // This prevents users from accessing protected routes after error
        const checkAuthOnMount = async () => {
            try {
                const tokens = await getTokens();
                if (!tokens?.accessToken) {
                    // No token, redirect to welcome after a short delay to allow UI to render
                    setTimeout(() => {
                        router.replace("/welcome");
                    }, 100);
                }
            } catch (error) {
                // Error getting tokens, redirect to welcome
                setTimeout(() => {
                    router.replace("/welcome");
                }, 100);
            }
        };

        checkAuthOnMount();
    }, []);

    const handleRetry = async () => {
        if (!failedRequest) {
            // If no failed request, check auth and navigate
            await checkAuthAndNavigate(() => {
                try {
                    router.back();
                } catch {
                    router.replace("/(tabs)/patients");
                }
            });
            return;
        }

        setIsRetrying(true);
        try {
            // Clear the stored failed request
            await clearFailedRequest();

            // Retry the failed request
            const config: any = {
                method: failedRequest.method.toLowerCase(),
                url: failedRequest.url,
            };

            if (failedRequest.baseURL) {
                config.baseURL = failedRequest.baseURL;
            }

            if (failedRequest.data) {
                config.data = failedRequest.data;
            }

            if (failedRequest.params) {
                config.params = failedRequest.params;
            }

            if (failedRequest.headers) {
                config.headers = { ...failedRequest.headers };
            }

            // Make the request
            await axiosInstance(config);

            // If successful, check auth and navigate
            await checkAuthAndNavigate(() => {
                try {
                    router.back();
                } catch {
                    router.replace("/(tabs)/patients");
                }
            });
        } catch (error) {
            // If retry fails, stay on error page
            if (__DEV__) {
                console.error("Retry failed:", error);
            }
            setIsRetrying(false);
        }
    };

    const handleGoHome = async () => {
        await checkAuthAndNavigate(() => {
            router.replace("/(tabs)/patients");
        });
    };

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing["6"] }]} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={64} color="system.red" />
                </View>

                <BaseText type="Title1" weight="700" color="labels.primary" style={styles.title}>
                    Server Error
                </BaseText>

                <BaseText type="Body" weight="400" color="labels.secondary" style={styles.description}>
                    Unfortunately, a problem occurred while connecting to the server. Please try again.
                </BaseText>

                <View style={styles.buttonContainer}>
                    <BaseButton label={isRetrying ? "Retrying..." : "Try Again"} onPress={handleRetry} ButtonStyle="Filled" size="Large" rounded style={styles.button} disabled={isRetrying} isLoading={isRetrying} />
                    <BaseButton label="Go Home" onPress={handleGoHome} ButtonStyle="Tinted" size="Large" rounded style={styles.button} disabled={isRetrying} />
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
    icon: {
        fontSize: 64,
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
