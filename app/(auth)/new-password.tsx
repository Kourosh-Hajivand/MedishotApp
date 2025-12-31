import { BaseButton, BaseText, ControlledInput, KeyboardAwareScrollView } from "@/components";
import { useResetPassword } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { Platform, View } from "react-native";
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
    const { mutate: resetPassword, isPending: isResetting } = useResetPassword(() => {
        router.push("/(auth)/login");
    });
    const onSubmit = (data: ResetPasswordFormData) => {
        resetPassword({ password: data.password, password_confirmation: data.confirmPassword });
    };
    return (
        <KeyboardAwareScrollView
            backgroundColor="white"
            contentContainerClassName="flex-1 bg-white"
        >
            <View className="flex-1 px-10 justify-between pb-[30%] ">
                <View style={{ paddingTop: insets.top + 40, gap: 71 }}>
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
                        <ControlledInput control={control} name="password" type="password" label="Password" secureTextEntry autoComplete="new-password" error={errors.password?.message} />
                        <ControlledInput control={control} name="confirmPassword" type="password" label="Confirm Password" secureTextEntry autoComplete="new-password" error={errors.confirmPassword?.message} />
                    </View>
                </View>
                <BaseButton ButtonStyle="Filled" size="Large" label="Reset Pasword" className="!rounded-2xl" isLoading={isResetting} disabled={isResetting} onPress={handleSubmit(onSubmit)} />
            </View>
        </KeyboardAwareScrollView>
    );
}
