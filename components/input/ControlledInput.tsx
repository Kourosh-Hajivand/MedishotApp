import { formatNumber } from "@/utils/helper/HelperFunction";
import classNames from "classnames";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { EyeInvisibleIcon, EyeVisibleIcon } from "../../assets/icons";
import { InputProps } from "../../models/models";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors";
import { BaseText } from "../text/BaseText";

const ControlledInputComponent = <T extends FieldValues>({ control, name, label, error, disabled = false, type = "text", optional, info, size = "Large", SperatedNumber, centerText, haveBorder = true, hideError = false, ...props }: InputProps<T> & TextInputProps, ref: React.Ref<TextInput>) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Expose inputRef methods to parent via ref
    useImperativeHandle(ref, () => inputRef.current!);

    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
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
                render={({ field: { onChange, onBlur, value } }) => {
                    const handleNumberChange = (text: string) => {
                        const cleaned = text.replace(/,/g, "");
                        onChange(cleaned);
                    };

                    const handleChange = (text: string) => {
                        if (SperatedNumber) handleNumberChange(text);
                        else onChange(text);
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
                                    {!value && !!label && (
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
                                        value={SperatedNumber && value ? formatNumber(value.toString()) : value}
                                        onChangeText={handleChange}
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
                                        keyboardType={props.keyboardType ?? (type === "number" ? "numeric" : "default")}
                                        textAlign={centerText ? "center" : "left"}
                                        returnKeyType={props.returnKeyType || (type === "password" && name === "confirmPassword" ? "done" : "next")}
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

                                    {type === "password" && (
                                        <TouchableOpacity onPress={togglePasswordVisibility} disabled={disabled} style={styles.passwordToggle}>
                                            {showPassword ? <EyeVisibleIcon width={20} height={20} strokeWidth={0} /> : <EyeInvisibleIcon width={20} height={20} strokeWidth={0} />}
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {(!!error || haveBorder) && !hideError && (
                                <View style={styles.errorContainer}>
                                    {!!error && !hideError && (
                                        <BaseText color="system.red" type="Caption2" className={classNames({ "ml-2": !haveBorder })}>
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

const ControlledInput = forwardRef(ControlledInputComponent) as <T extends FieldValues>(props: InputProps<T> & TextInputProps & { ref?: React.Ref<TextInput> }) => React.ReactElement;

export default ControlledInput;

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
