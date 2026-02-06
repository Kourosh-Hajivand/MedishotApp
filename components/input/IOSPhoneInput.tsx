import { extractPhoneDigits, formatPhoneDisplay, toE164 } from "@/utils/helper/phoneUtils";
import classNames from "classnames";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Controller, FieldValues, useWatch } from "react-hook-form";
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { InputProps } from "../../models/models";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors";
import { BaseText } from "../text/BaseText";

const IOSPhoneInputComponent = <T extends FieldValues>({ control, name, label, error, disabled = false, optional, info, size = "Large", haveBorder = true, ...props }: InputProps<T> & TextInputProps, ref: React.Ref<TextInput>) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const isInternalChangeRef = useRef(false);
    const lastSentValueRef = useRef<string>("");
    const isInitializedRef = useRef(false);

    useImperativeHandle(ref, () => inputRef.current!);

    // Watch the form value to sync display value when it changes externally
    const formValue = useWatch({ control, name });

    // Initialize localDigits from formValue - use empty string initially, will be synced in useEffect
    const [localDigits, setLocalDigits] = useState<string>("");

    useEffect(() => {
        if (formValue !== undefined) {
            // Initialize on first render
            if (!isInitializedRef.current) {
                const extracted = extractPhoneDigits(formValue || "");
                setLocalDigits(extracted);
                lastSentValueRef.current = formValue || "";
                isInitializedRef.current = true;
                return;
            }

            // Skip sync if this change was triggered by our own handleChange
            if (isInternalChangeRef.current && formValue === lastSentValueRef.current) {
                isInternalChangeRef.current = false;
                return;
            }

            // External change - sync localDigits with form value
            const extracted = extractPhoneDigits(formValue || "");
            setLocalDigits((prev) => {
                // Only update if different to prevent unnecessary re-renders
                if (extracted !== prev) {
                    return extracted;
                }
                return prev;
            });
            // Reset flag for external changes
            isInternalChangeRef.current = false;
        }
    }, [formValue]);

    // Format display value from local digits
    const displayValue = formatPhoneDisplay(localDigits);

    const focusInput = () => !disabled && inputRef.current?.focus();

    const height = size === "Large" ? 50 : 44;

    const animatedRingStyle = useAnimatedStyle(() => {
        const scale = withSpring(isFocused ? 1.05 : 1);
        const opacity = withTiming(isFocused ? 1 : 0);
        return { transform: [{ scale }], opacity };
    });

    return (
        <View style={styles.container}>
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur } }) => {
                    const handleChange = (text: string) => {
                        // Extract digits from input (handle both formatted and unformatted text)
                        const digits = text.replace(/\D/g, "");
                        const limited = digits.slice(0, 10);

                        // Update local state immediately for smooth typing
                        setLocalDigits(limited);

                        // Convert to E.164 format and notify parent
                        let valueToSend: string;
                        if (limited.length === 10) {
                            // Valid complete phone number - send E.164 format
                            valueToSend = toE164(limited);
                        } else if (limited.length > 0) {
                            // Partial input - send raw digits to preserve state while typing
                            valueToSend = limited;
                        } else {
                            // Empty input - clear everything
                            valueToSend = "";
                        }

                        // Mark this as an internal change and track what we're sending
                        isInternalChangeRef.current = true;
                        lastSentValueRef.current = valueToSend;
                        onChange(valueToSend);

                        // When 10 digits complete: move to next field or close keyboard
                        if (limited.length === 10) {
                            const submitOrBlur = () => {
                                if (props.onSubmitEditing) {
                                    props.onSubmitEditing({ nativeEvent: { text: valueToSend } } as any);
                                } else {
                                    inputRef.current?.blur();
                                }
                            };
                            setTimeout(submitOrBlur, 0);
                        }
                    };

                    return (
                        <>
                            <View style={styles.inputContainer}>
                                {haveBorder && (
                                    <Animated.View
                                        style={[
                                            styles.ring,
                                            {
                                                backgroundColor: error ? colors.system.red + "26" : colors.primary[500] + "26",
                                            },
                                            animatedRingStyle,
                                        ]}
                                    />
                                )}

                                <TouchableOpacity
                                    onPress={focusInput}
                                    disabled={disabled}
                                    activeOpacity={0.8}
                                    className={classNames("relative w-full flex-row items-center rounded-xl px-4")}
                                    style={[
                                        styles.input,
                                        {
                                            height,
                                            borderColor: error ? colors.system.red : isFocused ? colors.primary[500] : colors.border,
                                            backgroundColor: colors.system.white,
                                            opacity: disabled ? 0.5 : 1,
                                            borderWidth: haveBorder ? 1 : 0,
                                        },
                                    ]}
                                >
                                    {/* Placeholder */}
                                    {!displayValue && !!label && (
                                        <View style={styles.placeholder}>
                                            <BaseText type="Body" color={haveBorder ? "text-secondary" : "labels.tertiary"} className="absolute">
                                                {label}
                                                {/* {optional && `(Optional)`} */}
                                            </BaseText>
                                        </View>
                                    )}

                                    {/* INPUT */}
                                    <TextInput
                                        ref={inputRef}
                                        {...props}
                                        value={displayValue}
                                        onChangeText={handleChange}
                                        keyboardType="phone-pad"
                                        onBlur={(e) => {
                                            setIsFocused(false);
                                            onBlur();
                                            props.onBlur?.(e);
                                        }}
                                        onFocus={(e) => {
                                            setIsFocused(true);
                                            props.onFocus?.(e);
                                        }}
                                        editable={!disabled}
                                        placeholder=""
                                        placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
                                        textContentType="telephoneNumber"
                                        autoComplete="tel"
                                        textAlign="left"
                                        returnKeyType={props.returnKeyType || "next"}
                                        onSubmitEditing={props.onSubmitEditing || undefined}
                                        blurOnSubmit={props.blurOnSubmit !== undefined ? props.blurOnSubmit : false}
                                        style={[
                                            styles.textInput,
                                            {
                                                paddingVertical: 0,
                                                textAlignVertical: "center",
                                                color: colors.text,
                                                paddingBottom: 3,
                                            },
                                        ]}
                                    />
                                </TouchableOpacity>
                            </View>

                            {(!!error || haveBorder) && (
                                <View style={styles.errorContainer}>
                                    {!!error && (
                                        <BaseText color="system.red" type="Caption2">
                                            {error}
                                        </BaseText>
                                    )}
                                    {!error && info && (
                                        <BaseText color="text-secondary" type="Caption2">
                                            {info}
                                        </BaseText>
                                    )}
                                </View>
                            )}
                        </>
                    );
                }}
            />
        </View>
    );
};

const IOSPhoneInput = forwardRef(IOSPhoneInputComponent) as <T extends FieldValues>(props: InputProps<T> & TextInputProps & { ref?: React.Ref<TextInput> }) => React.ReactElement;

export default IOSPhoneInput;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        gap: spacing["1"],
    },
    inputContainer: {
        position: "relative",
    },
    ring: {
        position: "absolute",
        left: "1.5%",
        top: "-2.5%",
        width: "97%",
        height: "106%",
        borderRadius: 13,
    },
    input: {
        width: "100%",
        paddingHorizontal: spacing["4"],
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
    },
    placeholder: {
        position: "absolute",
        left: spacing["4"],
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
    },
    textInput: {
        flex: 1,
        fontSize: 17,
        lineHeight: 22,
        fontWeight: "400",
    },
    errorContainer: {
        height: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        paddingHorizontal: spacing["1"],
    },
});
