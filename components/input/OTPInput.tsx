import React, { useEffect, useMemo, useRef, useState } from "react";
import { NativeSyntheticEvent, Platform, StyleSheet, TextInput, TextInputKeyPressEventData, TextInputProps, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors";
import { BaseText } from "../text/BaseText";

type OTPInputProps = {
    length: number;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "keyboardType" | "maxLength">;
};

const normalizeDigits = (s: string) =>
    s
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
        .replace(/[^0-9]/g, "");

export default function OTPInput({ length, value, onChange, error, disabled, autoFocus = true, inputProps }: OTPInputProps) {
    const inputsRef = useRef<(TextInput | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const chars = useMemo(() => {
        const v = normalizeDigits(value || "");
        return Array.from({ length }, (_, i) => v[i] ?? "");
    }, [value, length]);

    useEffect(() => {
        if (!autoFocus || disabled) return;
        const firstEmpty = chars.findIndex((c) => !c);
        const idx = firstEmpty === -1 ? length - 1 : firstEmpty;
        inputsRef.current[idx]?.focus();
    }, [autoFocus, disabled, chars, length]);

    const setCharAt = (index: number, ch: string) => {
        const arr = [...chars];
        arr[index] = ch;
        onChange(arr.join(""));
    };

    const handleChange = (index: number, text: string) => {
        const cleaned = normalizeDigits(text);

        if (cleaned.length > 1) {
            const arr = [...chars];
            for (let i = 0; i < cleaned.length && index + i < length; i++) {
                arr[index + i] = cleaned[i];
            }
            onChange(arr.join(""));
            const last = Math.min(index + cleaned.length, length - 1);
            inputsRef.current[last]?.focus();
            return;
        }

        if (cleaned.length === 1) {
            setCharAt(index, cleaned);
            if (index < length - 1) inputsRef.current[index + 1]?.focus();
        } else {
            setCharAt(index, "");
        }
    };

    const onKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        if (e.nativeEvent.key === "Backspace" && !chars[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
            const arr = [...chars];
            arr[index - 1] = "";
            onChange(arr.join(""));
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputsContainer}>
                {Array.from({ length }).map((_, i) => {
                    const filled = !!chars[i];
                    const isFocused = focusedIndex === i;

                    return (
                        <OTPBox
                            key={i}
                            index={i}
                            value={chars[i]}
                            filled={filled}
                            isFocused={isFocused}
                            error={!!error}
                            disabled={disabled}
                            inputRef={(el) => (inputsRef.current[i] = el)}
                            onChangeText={(t) => handleChange(i, t)}
                            onKeyPress={(e) => onKeyPress(i, e)}
                            onFocus={() => setFocusedIndex(i)}
                            onBlur={() => setFocusedIndex(null)}
                            inputProps={inputProps}
                        />
                    );
                })}
            </View>

            {/* Error Message */}
            {!!error && (
                <View style={styles.errorContainer}>
                    <BaseText color="system.red" type="Caption2">
                        {error}
                    </BaseText>
                </View>
            )}
        </View>
    );
}

type OTPBoxProps = {
    index: number;
    value: string;
    filled: boolean;
    isFocused: boolean;
    error: boolean;
    disabled?: boolean;
    inputRef: (el: TextInput | null) => void;
    onChangeText: (text: string) => void;
    onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
    onFocus: () => void;
    onBlur: () => void;
    inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "keyboardType" | "maxLength">;
};

function OTPBox({ index, value, filled, isFocused, error, disabled, inputRef, onChangeText, onKeyPress, onFocus, onBlur, inputProps }: OTPBoxProps) {
    const animatedRingStyle = useAnimatedStyle(() => {
        const scale = withSpring(isFocused ? 1.05 : 1);
        const opacity = withTiming(isFocused ? 1 : 0);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    const borderColor = error ? colors.system.red : isFocused ? colors.primary[500] : filled ? colors.primary[500] : colors.border;

    return (
        <View style={styles.boxContainer}>
            {/* Animated Ring */}
            <Animated.View
                style={[
                    styles.ring,
                    {
                        backgroundColor: error ? colors.system.red + "26" : colors.primary[500] + "26",
                    },
                    animatedRingStyle,
                ]}
            />

            {/* Input Box */}
            <TextInput
                ref={inputRef}
                value={value}
                editable={!disabled}
                textContentType={Platform.OS === "ios" ? "oneTimeCode" : ("oneTimeCode" as any)}
                autoComplete={Platform.select({ ios: "one-time-code", android: "sms-otp", default: "one-time-code" }) as any}
                keyboardType={Platform.select({ ios: "number-pad", default: "numeric" })}
                maxLength={1}
                onChangeText={onChangeText}
                onKeyPress={onKeyPress}
                onFocus={onFocus}
                onBlur={onBlur}
                style={[
                    styles.input,
                    {
                        borderColor,
                        backgroundColor: colors.system.white,
                        opacity: disabled ? 0.5 : 1,
                        color: colors.text,
                    },
                ]}
                accessibilityLabel={`کد تایید رقم ${index + 1}`}
                {...inputProps}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        gap: spacing["1"],
    },
    inputsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        gap: spacing["2"],
    },
    boxContainer: {
        flex: 1,
        position: "relative",
        aspectRatio: 1,
    },
    ring: {
        position: "absolute",
        left: "-2.5%",
        top: "-2.5%",
        width: "105%",
        height: "105%",
        borderRadius: 13,
    },
    input: {
        width: "100%",
        height: "100%",
        borderRadius: 12,
        borderWidth: 1,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "600",
        paddingVertical: 0,
    },
    errorContainer: {
        height: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        paddingHorizontal: spacing["1"],
    },
});
