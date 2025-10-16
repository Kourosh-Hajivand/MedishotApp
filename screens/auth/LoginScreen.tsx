import { storeTokens } from "@/utils/helper/tokenStorage";
import { useLogin } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { BaseButton, BaseText, ControlledInput } from "../../components";
import { QueryKeys } from "../../models/enums";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared.js";
import { AuthWithSocial } from "./components/AuthWithSocial";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginScreen: React.FC = () => {
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const {
        mutate: login,
        isPending,
        error,
    } = useLogin(async (response) => {
        await storeTokens(response.data.token);

        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
        const hasCompletedProfile = response.data.people.first_name && response.data.people.last_name;

        if (!hasCompletedProfile) {
            router.replace("/(auth)/completeProfile");
        } else {
            router.replace("/(tabs)/patients");
        }
    });

    const onSubmit = async (data: LoginFormData) => {
        login(data);
    };

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.content} className="flex-1 px-10 ">
                <View className="flex-1 items-center justify-between gap-10">
                    <View style={{ paddingTop: insets.top + 40 }} className="w-full flex-1 items-center justify-start">
                        <BaseText type="Title1" weight={"700"} color="system.black" className="mb-8">
                            Welcome Back
                        </BaseText>

                        <View className="w-full mt-[40px]">
                            <View className="gap-0">
                                <ControlledInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} />
                                <ControlledInput control={control} type="password" name="password" label="Password" secureTextEntry autoComplete="password" error={errors.password?.message} />
                                {error?.message && (
                                    <BaseText color="system.red" type="Caption2" className="mt-2">
                                        {error?.message}
                                    </BaseText>
                                )}
                                <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push("/(auth)/reset-password")} className="flex-row items-center justify-between">
                                    <BaseText type="Subhead" color="system.blue" weight="400">
                                        Forgot password?
                                    </BaseText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View className="w-full flex-1  items-center  justify-center gap-10">
                        <BaseButton onPress={handleSubmit(onSubmit)} disabled={isPending} size="Large" ButtonStyle="Filled" className=" w-full" label={isPending ? "Logging in..." : "Log In"} />
                        <View className="gap-10 w-full items-center justify-center ">
                            <View style={styles.socialContainer} className="w-full gap-4">
                                <AuthWithSocial isLogin={true} />
                            </View>
                            <View style={styles.signUpContainer} className="flex-row items-center gap-1">
                                <BaseText type="Callout" color="labels.secondary">
                                    Don't have an account?
                                </BaseText>
                                <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                                    <BaseText type="Callout" color="system.blue">
                                        Sign up
                                    </BaseText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        flex: 1,
    },

    forgotPassword: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    socialContainer: {
        width: "100%",
        marginTop: 0,
    },
    signUpContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        marginTop: 0,
    },
});

LoginScreen.displayName = "LoginScreen";
