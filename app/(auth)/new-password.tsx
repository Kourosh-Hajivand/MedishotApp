import { BaseButton, BaseText, ControlledInput } from "@/components";
import { useResetPassword } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Alert, Animated, Keyboard, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import z from "zod";
const ResetPasswordFormDataSchema = z
    .object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });
type ResetPasswordFormData = z.infer<typeof ResetPasswordFormDataSchema>;

export default function NewPassword() {
    const insets = useSafeAreaInsets();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(ResetPasswordFormDataSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });
    const { mutate: resetPassword, isPending: isResetting } = useResetPassword(
        () => {
            router.push("/(auth)/login");
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to reset password. Please try again.");
        },
    );

    // Animation for Reset Password button
    const bottomSectionTranslateY = useRef(new Animated.Value(0)).current;

    // Refs for fields
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => {
            const keyboardHeight = event.endCoordinates.height;

            // Compute offset: button at bottom of screen needs larger offset
            const offset = Math.min(keyboardHeight * 0.7, 280) + 30;

            Animated.timing(bottomSectionTranslateY, {
                toValue: -offset,
                duration: Platform.OS === "ios" ? event.duration || 300 : 300,
                useNativeDriver: true,
            }).start();
        });

        const keyboardWillHide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", (event) => {
            Animated.timing(bottomSectionTranslateY, {
                toValue: 0,
                duration: Platform.OS === "ios" ? event.duration || 300 : 300,
                useNativeDriver: true,
            }).start();
        });

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [bottomSectionTranslateY]);

    const onSubmit = useCallback(
        (data: ResetPasswordFormData) => {
            resetPassword({ password: data.password, password_confirmation: data.confirmPassword });
        },
        [resetPassword],
    );
    return (
        <View style={{ flex: 1, backgroundColor: "white" }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, backgroundColor: "white" }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
                <View className="flex-1 px-10" style={{ paddingTop: insets.top + 40 }}>
                    <View style={{ gap: 71 }}>
                        <View className="gap-2">
                            <BaseText type="Title1" weight="700" color="system.black" className="!text-center">
                                Set a New Password
                            </BaseText>
                            <View>
                                <BaseText type="Subhead" weight="300" color="system.black" className="!text-center">
                                    Choose a strong password and confirm it below.
                                </BaseText>
                            </View>
                        </View>
                        <View className="">
                            <ControlledInput control={control} name="password" type="password" label="Password" secureTextEntry autoComplete="new-password" error={errors.password?.message} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => confirmPasswordRef.current?.focus()} ref={passwordRef} />
                            <ControlledInput control={control} name="confirmPassword" type="password" label="Confirm Password" secureTextEntry autoComplete="new-password" error={errors.confirmPassword?.message} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={handleSubmit(onSubmit)} ref={confirmPasswordRef} />
                        </View>
                    </View>
                </View>
            </ScrollView>
            <Animated.View
                style={{
                    paddingBottom: insets.bottom + 40 || 40,
                    paddingHorizontal: 40,
                    backgroundColor: "white",
                    transform: [{ translateY: bottomSectionTranslateY }],
                }}
            >
                <BaseButton ButtonStyle="Filled" size="Large" label="Reset Password" className="!rounded-2xl" isLoading={isResetting} disabled={isResetting} onPress={handleSubmit(onSubmit)} />
            </Animated.View>
        </View>
    );
}
