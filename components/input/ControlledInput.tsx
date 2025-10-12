import classNames from "classnames";
import React, { useRef, useState } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Platform, StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { EyeInvisibleIcon, EyeVisibleIcon } from "../../assets/icons";
import { InputProps } from "../../models/models";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors";
import { formatNumber, formatUSPhoneNumber } from "../../utils/helper/HelperFunction";
import { BaseText } from "../text/BaseText";

export default function ControlledInput<T extends FieldValues>({ control, name, label, error, disabled = false, type = "text", PlaceHolder, optional, info, size = "Large", SperatedNumber, centerText, haveBorder = true, ...props }: InputProps<T> & TextInputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isDark = "dark";
    const inputRef = useRef<TextInput>(null);

    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

    const focusInput = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    };

    const height = size === "Large" ? 50 : 44;
    const paddingY = size === "Large" ? 13 : 10;

    const animatedRingStyle = useAnimatedStyle(() => {
        const scale = withSpring(isFocused ? 1.05 : 1);
        const opacity = withTiming(isFocused ? 1 : 0);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    return (
        <View style={styles.container} className="w-full gap-0">
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <View style={styles.inputContainer} className="relative">
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
                                        backgroundColor: isDark ? colors.system.white : colors.system.white,
                                        opacity: disabled ? 0.5 : 1,
                                        borderWidth: haveBorder ? 1 : 0,
                                    },
                                ]}
                            >
                                {/* Placeholder */}
                                {!value && !!label && (
                                    <View style={styles.placeholder} className="flex-row items-center">
                                        <BaseText type="Body" color={haveBorder ? "text-secondary" : "labels.tertiary"} className="absolute">
                                            {label} {optional && `(Optional)`}
                                        </BaseText>
                                        {/* {optional && (
                                            <BaseText type="Caption1" color={haveBorder ? "text-secondary" : "labels.tertiary"}>
                                                {`(Optional)`}
                                            </BaseText>
                                        )} */}
                                    </View>
                                )}

                                {/* Input */}
                                <TextInput
                                    ref={inputRef}
                                    {...props}
                                    value={SperatedNumber && value ? formatNumber(value.toString()) : value}
                                    onChangeText={(text) => (name === "phoneNumber" ? onChange(formatUSPhoneNumber(text)) : SperatedNumber ? onChange(text.replace(/,/g, "")) : onChange(text))}
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
                                    secureTextEntry={type === "password" && !showPassword}
                                    keyboardType={type === "number" ? "numeric" : "default"}
                                    textAlign={centerText ? "center" : "left"}
                                    className="font-system dark:text-dark.text flex-1 py-0"
                                    style={[
                                        styles.textInput,
                                        {
                                            paddingVertical: Platform.OS === "ios" ? paddingY : 10,
                                            color: isDark ? colors.system.black : colors.text,
                                        },
                                    ]}
                                />

                                {/* Toggle Password */}
                                {type === "password" && (
                                    <TouchableOpacity onPress={togglePasswordVisibility} disabled={disabled} style={styles.passwordToggle} className="pl-2" accessibilityLabel="Toggle Password Visibility">
                                        {showPassword ? <EyeVisibleIcon width={20} height={20} strokeWidth={0} /> : <EyeInvisibleIcon width={20} height={20} strokeWidth={0} />}
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Error or Info */}
                        {(!!error || haveBorder) && (
                            <View style={styles.errorContainer} className="h-5  flex-row items-center gap-1 px-1">
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
                )}
            />
        </View>
    );
}

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
        // top: Platform.OS === 'ios' ? paddingY : 10,
    },
    textInput: {
        flex: 1,
        paddingVertical: 0,
    },
    passwordToggle: {
        paddingLeft: spacing["2"],
    },
    errorContainer: {
        height: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        paddingHorizontal: spacing["1"],
    },
});
