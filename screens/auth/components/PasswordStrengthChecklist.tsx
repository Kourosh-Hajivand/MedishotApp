import { BaseText } from "@/components";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import React from "react";
import { StyleSheet, View } from "react-native";

const RULES: { label: string; check: (p: string) => boolean }[] = [
    { label: "At least 8 characters", check: (p) => p.length >= 8 },
    { label: "One lowercase letter", check: (p) => /[a-z]/.test(p) },
    { label: "One uppercase letter", check: (p) => /[A-Z]/.test(p) },
    { label: "One number", check: (p) => /\d/.test(p) },
];

export interface PasswordStrengthChecklistProps {
    password: string;
}

export const PasswordStrengthChecklist: React.FC<PasswordStrengthChecklistProps> = ({ password }) => {
    if (password.length === 0) return null;

    return (
        <View style={styles.container}>
            {RULES.map(({ label, check }) => {
                const met = check(password);
                return (
                    <View key={label} style={styles.row}>
                        <View
                            style={[
                                styles.bullet,
                                { backgroundColor: met ? colors.system.green : colors.labels.tertiary },
                            ]}
                        />
                        <BaseText
                            type="Caption2"
                            color={met ? "system.green" : "labels.tertiary"}
                        >
                            {label}
                        </BaseText>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing["1"],
        width: "100%",

        paddingVertical: spacing["4"],
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1.5"],
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
