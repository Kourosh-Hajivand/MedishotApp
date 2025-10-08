import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { z } from "zod";
import { BaseButton, BaseText, ControlledInput } from "../../components";
import { QueryKeys } from "../../models/enums";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared.js";
import { AuthService } from "../../utils/service";
import { LoginResponse } from "../../utils/service/models/ResponseModels";
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
    const queryClient = useQueryClient();
    const {
        mutate: login,
        isPending,
        error,
    } = useMutation({
        mutationFn: (data: LoginFormData) => AuthService.login(data),
        onSuccess: async (data: LoginResponse) => {
            queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
            router.replace("/(tabs)/patients");
        },
        onError: (error: AxiosError) => {
            console.log((error?.response?.data as any)?.message);
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        login(data);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={styles.scrollView} contentContainerClassName="flex-1">
                <View style={styles.content} className="flex-1 px-10 py-[10%]">
                    <View style={styles.mainContent} className="flex-1 items-center justify-start">
                        <BaseText type="Title1" weight={"700"} color="system.black" className="mb-8">
                            Welcome Back
                        </BaseText>

                        <View style={styles.formContainer} className="mt-20 w-full ">
                            <View className="gap-4">
                                <ControlledInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} />
                                <ControlledInput control={control} type="password" name="password" label="Password" secureTextEntry autoComplete="password" error={errors.password?.message} />
                                {error?.message && (
                                    <BaseText color="system.red" type="Caption2" className="mt-2">
                                        {error?.message}
                                    </BaseText>
                                )}
                                <TouchableOpacity style={styles.forgotPassword} disabled className="flex-row items-center justify-between">
                                    <BaseText type="Subhead" color="system.blue" weight="400">
                                        Forgot password?
                                    </BaseText>
                                </TouchableOpacity>
                            </View>
                            <BaseButton onPress={handleSubmit(onSubmit)} disabled={isPending} size="Large" ButtonStyle="Filled" className="mt-24" style={{ marginTop: spacing["24"] }} label={isPending ? "Logging in..." : "Log In"} />
                        </View>
                        <View style={styles.socialContainer} className="mt-16 w-full gap-4">
                            <AuthWithSocial isLogin={true} />
                        </View>
                        <View style={styles.signUpContainer} className="mt-16 flex-row items-center gap-1">
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
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingHorizontal: spacing["10"],
        paddingVertical: "10%",
    },
    mainContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    formContainer: {
        width: "100%",
        marginTop: 80,
    },

    forgotPassword: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    socialContainer: {
        width: "100%",
        marginTop: 64,
    },
    signUpContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        marginTop: 64,
    },
});

LoginScreen.displayName = "LoginScreen";
