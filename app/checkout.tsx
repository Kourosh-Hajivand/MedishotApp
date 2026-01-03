import { BaseText } from "@/components";
import colors from "@/theme/colors";
import { useCheckoutCancel, useCheckoutSuccess } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CheckoutScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ checkout_url?: string; practice_id?: string; plan_id?: string }>();
    const { selectedPractice } = useProfileStore();
    const webViewRef = useRef<WebView>(null);
    const hasProcessedSuccess = useRef(false);
    const hasProcessedCancel = useRef(false);

    const { mutate: checkoutSuccess, isPending: isProcessingSuccess } = useCheckoutSuccess(
        (data) => {
            // After successful checkout, the backend should have already processed the payment
            // We just need to refresh the subscription status
            router.dismiss();
            router.replace("/(profile)/subscription");
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to process checkout. Please contact support.");
            router.dismiss();
        },
    );


    const { mutate: checkoutCancel } = useCheckoutCancel(
        () => {
            router.dismiss();
        },
        (error) => {
            console.error("Checkout cancel error:", error);
            router.dismiss();
        },
    );

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;

        // Check for success URL - Stripe redirects to our success_url
        // The URL will be: https://medishots.com/checkout/success?practice_id=X&plan_id=Y&session_id=Z
        // Or Stripe might append session_id to the URL
        if (url.includes("medishots.com/checkout/success") || (url.includes("/checkout/success") && url.includes("practice_id"))) {
            if (!hasProcessedSuccess.current && params.practice_id && params.plan_id && selectedPractice?.id) {
                hasProcessedSuccess.current = true;

                // Extract session_id from URL (Stripe appends it)
                const sessionIdMatch = url.match(/session_id=([^&]+)/);
                const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

                if (sessionId && selectedPractice.id) {
                    checkoutSuccess({
                        practiceId: selectedPractice.id,
                        sessionId: sessionId,
                    });
                } else {
                    // If no session_id in URL, try to extract from Stripe's redirect
                    // Sometimes Stripe redirects with session_id in a different format
                    Alert.alert("Error", "Session ID not found. Please try again.");
                    router.dismiss();
                }
            }
        }

        // Check for cancel URL - Stripe redirects to our cancel_url
        // The URL will be: https://medishots.com/checkout/cancel?practice_id=X&plan_id=Y
        if (url.includes("medishots.com/checkout/cancel") || (url.includes("/checkout/cancel") && url.includes("practice_id"))) {
            if (!hasProcessedCancel.current && params.practice_id && params.plan_id && selectedPractice?.id) {
                hasProcessedCancel.current = true;
                const practiceId = parseInt(params.practice_id);
                const planId = parseInt(params.plan_id);
                if (practiceId && planId) {
                    checkoutCancel({
                        practiceId: practiceId,
                        planId: planId,
                    });
                }
            }
        }

        // Also check for Stripe's standard success/cancel patterns
        if (url.includes("session_id=") && !url.includes("cancel") && !hasProcessedSuccess.current) {
            // This might be Stripe's redirect after successful payment
            if (params.practice_id && params.plan_id && selectedPractice?.id) {
                hasProcessedSuccess.current = true;
                const sessionIdMatch = url.match(/session_id=([^&]+)/);
                const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
                if (sessionId && selectedPractice.id) {
                    checkoutSuccess({
                        practiceId: selectedPractice.id,
                        sessionId: sessionId,
                    });
                }
            }
        }

        if (url.includes("canceled=true") && !hasProcessedCancel.current) {
            // Stripe's cancel pattern
            if (params.practice_id && params.plan_id && selectedPractice?.id) {
                hasProcessedCancel.current = true;
                const practiceId = parseInt(params.practice_id);
                const planId = parseInt(params.plan_id);
                if (practiceId && planId) {
                    checkoutCancel({
                        practiceId: practiceId,
                        planId: planId,
                    });
                }
            }
        }
    };

    if (!params.checkout_url) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <BaseText type="Body" weight="400" color="labels.secondary">
                    No checkout URL provided
                </BaseText>
            </View>
        );
    }

    if (isProcessingSuccess) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={colors.system.blue} />
                <BaseText type="Body" weight="400" color="labels.secondary" style={{ marginTop: 16 }}>
                    Processing your payment...
                </BaseText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ uri: params.checkout_url }}
                onNavigationStateChange={handleNavigationStateChange}
                style={[styles.webview, { marginTop: insets.top }]}
                contentInsetAdjustmentBehavior="never"
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.system.blue} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    centerContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
    },
});

