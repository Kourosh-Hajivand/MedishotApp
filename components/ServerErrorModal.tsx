import { BaseButton, BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import { colors } from "@/theme/colors";
import axiosInstance from "@/utils/AxiosInstans";
import { clearFailedRequest } from "@/utils/helper/failedRequestStorage";
import { useErrorStore } from "@/utils/hook/useErrorStore";
import { router } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ServerErrorModal() {
    const insets = useSafeAreaInsets();
    const { serverError, clearServerError } = useErrorStore();
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = async () => {
        if (!serverError.failedRequest) {
            clearServerError();
            return;
        }

        setIsRetrying(true);
        try {
            // Clear the stored failed request
            await clearFailedRequest();

            // Retry the failed request
            const config: any = {
                method: serverError.failedRequest.method.toLowerCase(),
                url: serverError.failedRequest.url,
            };

            if (serverError.failedRequest.baseURL) {
                config.baseURL = serverError.failedRequest.baseURL;
            }

            if (serverError.failedRequest.data) {
                config.data = serverError.failedRequest.data;
            }

            if (serverError.failedRequest.params) {
                config.params = serverError.failedRequest.params;
            }

            if (serverError.failedRequest.headers) {
                config.headers = { ...serverError.failedRequest.headers };
            }

            // Make the request
            await axiosInstance(config);

            // If successful, close modal
            clearServerError();
        } catch (error) {
            // If retry fails, stay on modal
            if (__DEV__) {
                console.error("Retry failed:", error);
            }
        } finally {
            setIsRetrying(false);
        }
    };

    const handleBack = () => {
        clearServerError();
        try {
            router.back();
        } catch {
            // If can't go back, just close modal
        }
    };

    if (!serverError.show) {
        return null;
    }

    return (
        <Modal visible={serverError.show} transparent animationType="fade" onRequestClose={handleBack}>
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleBack} />
                <View style={[styles.modalContainer, { paddingBottom: insets.bottom + spacing["6"] }]}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={64} color={colors.system.red} />
                        </View>

                        <BaseText type="Title1" weight="700" color="labels.primary" style={styles.title}>
                            Server Error
                        </BaseText>

                        <BaseText type="Body" weight="400" color="labels.secondary" style={styles.description}>
                            Unfortunately, a problem occurred while connecting to the server. Please try again.
                        </BaseText>

                        <View style={styles.buttonContainer}>
                            <BaseButton
                                label={isRetrying ? "Retrying..." : "Try Again"}
                                onPress={handleRetry}
                                ButtonStyle="Filled"
                                size="Large"
                                rounded
                                style={styles.button}
                                disabled={isRetrying}
                                isLoading={isRetrying}
                            />
                            <BaseButton
                                label="Go Back"
                                onPress={handleBack}
                                ButtonStyle="Tinted"
                                size="Large"
                                rounded
                                style={styles.button}
                                disabled={isRetrying}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: "90%",
        maxWidth: 400,
        backgroundColor: colors.system.white,
        borderRadius: 20,
        padding: spacing["6"],
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    content: {
        alignItems: "center",
    },
    iconContainer: {
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
    },
    buttonContainer: {
        width: "100%",
        gap: spacing["3"],
    },
    button: {
        width: "100%",
    },
});
