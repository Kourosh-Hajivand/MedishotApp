import { BaseButton, BaseText, ControlledInput } from "@/components";
import { useForgetPassword } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
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
    const { mutate: resetPassword, isPending: isResetting } = useForgetPassword(() => {
        router.push({
            pathname: "/(auth)/otp",
            params: { email, forgetPassword: "true" },
        });
    });
    const onSubmit = (data: ResetPasswordFormData) => {
        resetPassword(data);
    };
    return (
        <ScrollView contentContainerClassName="flex-1 bg-white">
            <View className="flex-1 px-10 justify-between pb-[30%] ">
                <View style={{ paddingTop: insets.top + 40, gap: 71 }}>
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
                        <ControlledInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} />
                    </View>
                </View>
                <BaseButton ButtonStyle="Filled" size="Large" label="Reset Pasword" className="!rounded-2xl" isLoading={isResetting} onPress={handleSubmit(onSubmit)} />
            </View>
        </ScrollView>
    );
}
