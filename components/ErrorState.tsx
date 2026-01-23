import { BaseButton, BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { SymbolViewProps } from "expo-symbols";
import React from "react";
import { StyleSheet, View } from "react-native";

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
    icon?: SymbolViewProps['name'];
    title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, icon = "exclamationmark.triangle.fill" as SymbolViewProps['name'], title = "Something went wrong" }) => {
    return (
        <View style={styles.container}>
            <IconSymbol name={icon} size={48} color={colors.system.red} />
            <BaseText type="Body" color="labels.primary" weight="600" style={styles.title}>
                {title}
            </BaseText>
            {message && (
                <BaseText type="Footnote" color="labels.secondary" style={styles.message}>
                    {message}
                </BaseText>
            )}
            {onRetry && (
                <BaseButton
                    label="Try Again"
                    ButtonStyle="Tinted"
                    size="Medium"
                    rounded={true}
                    onPress={onRetry}
                    leftIcon={<IconSymbol name="arrow.clockwise" size={20} color={colors.system.blue} />}
                    style={styles.button}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing["5"],
        backgroundColor: "white",
    },
    title: {
        marginTop: spacing["3"],
        marginBottom: spacing["1"],
    },
    message: {
        marginBottom: spacing["4"],
        textAlign: "center",
    },
    button: {
        marginTop: spacing["2"],
    },
});
