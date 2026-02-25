import { BaseButton, BaseText, ControlledInput } from "@/components";
import { useForgetPassword } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Alert, Animated, Keyboard, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import z from "zod";
const ResetPasswordFormDataSchema = z.object({
    email: z.string().email("Please enter a valid email"),
});
type ResetPasswordFormData = z.infer<typeof ResetPasswordFormDataSchema>;

export default function ResetPassword() {
    const insets = useSafeAreaInsets();
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(ResetPasswordFormDataSchema),
        defaultValues: {
            email: "",
        },
    });
    const email = watch("email");
    const { mutate: resetPassword, isPending: isResetting } = useForgetPassword(
        () => {
            router.push({
                pathname: "/(auth)/otp",
                params: { email, forgetPassword: "true" },
            });
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to send reset code. Please try again.");
        },
    );

    // Animation for Reset Password button
    const bottomSectionTranslateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => {
            const keyboardHeight = event.endCoordinates.height;

            const offset = Math.min(keyboardHeight * 0.7, 280) + 40;

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
            resetPassword(data);
        },
        [resetPassword],
    );
    return (
        <View style={{ flex: 1, backgroundColor: "white" }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, backgroundColor: "white" }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
                <View className="flex-1 px-10" style={{ paddingTop: insets.top + 40 }}>
                    <View className="gap-10" style={{ gap: 71 }}>
                        <View className="gap-2">
                            <BaseText type="Title1" weight="700" color="system.black" className="!text-center">
                                Enter Your Email
                            </BaseText>
                            <View>
                                <BaseText type="Subhead" weight="300" color="system.black" className="!text-center">
                                    You can change your password or login with code we will send to your gmail
                                </BaseText>
                            </View>
                        </View>
                        <View className="">
                            <ControlledInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={handleSubmit(onSubmit)} />
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
