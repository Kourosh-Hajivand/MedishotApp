import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { BaseButton, BaseText, ControlledInput } from "../../components";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared.js";
import { SignUpFormData, signUpSchema } from "../../utils/schema";
import { AuthService } from "../../utils/service";
import { AuthWithSocial } from "./components/AuthWithSocial";

export const SignUpScreen: React.FC = () => {
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const {
        mutate: register,
        isPending,
        error,
    } = useMutation({
        mutationFn: (data: SignUpFormData) => AuthService.register({ email: data.email, password: data.password }),
        onSuccess: (data) => {
            router.push({ pathname: "/(auth)/select-role", params: { token: data.data.token.access_token } });
        },
        onError: (error: AxiosError) => {
            console.log((error?.response?.data as any)?.message);
            console.log(error);
        },
    });

    const onSubmit = async (data: SignUpFormData) => {
        register(data);
    };

    return (
        <KeyboardAvoidingView className="bg-white" behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={styles.scrollView} contentContainerClassName="flex-1">
                <View style={styles.content} className="flex-1 px-10 py-[10%]">
                    <View style={styles.mainContent} className="flex-1 items-center justify-start">
                        <BaseText type="Title1" weight={"700"} color="system.black" className="mb-8">
                            Let's Get Started
                        </BaseText>

                        <View style={styles.formContainer} className="mt-20 w-full ">
                            <View style={styles.inputContainer}>
                                <ControlledInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} />
                                <ControlledInput control={control} type="password" name="password" label="Password" secureTextEntry autoComplete="new-password" error={errors.password?.message} />
                                <ControlledInput control={control} type="password" name="confirmPassword" label="Confirm Password" secureTextEntry autoComplete="new-password" error={errors.confirmPassword?.message} />
                            </View>
                            {error?.message && (
                                <BaseText color="system.red" type="Caption2" className="mt-2">
                                    {error?.message}
                                </BaseText>
                            )}
                            <BaseButton onPress={handleSubmit(onSubmit)} disabled={isPending} size="Large" ButtonStyle="Filled" style={{ marginTop: spacing["12"] }} className="mt-16" label={isPending ? "Creating Account..." : "Create Account"} />
                        </View>
                        <View style={styles.socialContainer} className="mt-16 w-full gap-4">
                            <AuthWithSocial isLogin={false} />
                        </View>
                        <View style={styles.loginContainer} className="mt-16 flex-row items-center gap-1">
                            <BaseText type="Callout" color="labels.secondary">
                                Already have an account?
                            </BaseText>
                            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                                <BaseText type="Callout" color="system.blue">
                                    Log in
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
    inputContainer: {
        gap: spacing["0"],
    },
    socialContainer: {
        width: "100%",
        marginTop: 64,
        gap: spacing["4"],
    },
    loginContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        marginTop: 64,
    },
});

SignUpScreen.displayName = "SignUpScreen";
