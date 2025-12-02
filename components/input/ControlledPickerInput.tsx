import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { router } from "expo-router";
import React from "react";
import { Controller, FieldValues } from "react-hook-form";
import { StyleSheet, TouchableOpacity } from "react-native";
import { BaseText } from "../text/BaseText";

interface PickerInputProps<T extends FieldValues> {
    control: any;
    name: keyof T;
    label: string;
    type: "date" | "gender";
    placeholder?: string;
    error?: string;
    noBorder?: boolean;
    disabled?: boolean;
}

// Store callbacks globally
const pickerCallbacks: { [key: string]: (value: string) => void } = {};

export function ControlledPickerInput<T extends FieldValues>({ control, name, label, type, placeholder, error, noBorder = false, disabled = false }: PickerInputProps<T>) {
    const formatDateDisplay = (dateString?: string) => {
        if (!dateString) return "";
        // Handle YYYY-MM-DD format
        const d = new Date(dateString + "T00:00:00");
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <Controller
            control={control}
            name={name as string}
            render={({ field: { onChange, value } }) => {
                const callbackKey = `picker_${String(name)}_${type}`;

                const handlePress = () => {
                    if (disabled) return;
                    // Store the onChange callback
                    pickerCallbacks[callbackKey] = onChange;

                    if (type === "date") {
                        router.push({
                            pathname: "/(modals)/select-date",
                            params: { callbackKey, currentValue: value || "" },
                        });
                    } else if (type === "gender") {
                        router.push({
                            pathname: "/(modals)/select-gender",
                            params: { callbackKey, currentValue: value || "" },
                        });
                    }
                };

                return (
                    <>
                        {/* دکمه ورودی */}
                        <TouchableOpacity
                            onPress={handlePress}
                            activeOpacity={0.7}
                            disabled={disabled}
                            style={[
                                styles.inputContainer,
                                {
                                    borderColor: error ? colors.system.red : colors.border,
                                    borderWidth: noBorder ? 0 : 1,
                                    opacity: disabled ? 0.5 : 1,
                                },
                            ]}
                        >
                            <BaseText type="Body" color={value ? "labels.primary" : "labels.tertiary"}>
                                {value ? (type === "date" ? formatDateDisplay(value) : value) : placeholder || label}
                            </BaseText>
                        </TouchableOpacity>

                        {/* خطا */}
                        {!!error && (
                            <BaseText type="Caption2" color="system.red" className="mt-1">
                                {error}
                            </BaseText>
                        )}
                    </>
                );
            }}
        />
    );
}

export const getPickerCallback = (key: string) => pickerCallbacks[key];
export const removePickerCallback = (key: string) => delete pickerCallbacks[key];

const styles = StyleSheet.create({
    inputContainer: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing["4"],
        justifyContent: "center",
        backgroundColor: colors.system.white,
    },
});
