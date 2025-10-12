import { useInitiateRegistration } from "@/utils/hook";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BaseButton, BaseText, ControlledInput } from "../../components";
import { spacing } from "../../styles/spaces";
import colors from "../../theme/colors.shared.js";
import { SignUpFormData, signUpSchema } from "../../utils/schema";
import { AuthWithSocial } from "./components/AuthWithSocial";

export const SignUpScreen: React.FC = () => {
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });
    const insets = useSafeAreaInsets();
    const {
        mutate: initiateRegistration,
        isPending: isInitiateRegistrationPending,
        error: initiateRegistrationError,
    } = useInitiateRegistration((data) => {
        router.push({
            pathname: "/(auth)/otp",
            params: {
                email: watch("email"),
                password: watch("password"),
            },
        });
    });

    const onSubmit = async (data: SignUpFormData) => {
        initiateRegistration(data);
    };

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.content} className="flex-1  px-10 ">
                <View className="flex-1 items-center  justify-between gap-10">
                    <View style={{ paddingTop: insets.top + 40 }} className="w-full items-center justify-start  flex-1 ">
                        <BaseText type="Title1" weight={"700"} color="system.black" className="mb-8">
                            Let's Get Started
                        </BaseText>

                        <View style={styles.formContainer} className="w-full mt-[40px]">
                            <View style={styles.inputContainer}>
                                <ControlledInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} />
                                <ControlledInput control={control} type="password" name="password" label="Password" secureTextEntry autoComplete="new-password" error={errors.password?.message} />
                                <ControlledInput control={control} type="password" name="confirmPassword" label="Confirm Password" secureTextEntry autoComplete="new-password" error={errors.confirmPassword?.message} />
                            </View>
                            {initiateRegistrationError?.message && (
                                <BaseText color="system.red" type="Caption2" className="mt-2">
                                    {initiateRegistrationError?.message}
                                </BaseText>
                            )}
                        </View>
                    </View>
                    <View className="w-full flex-1 b items-center justify-center gap-10">
                        <BaseButton onPress={handleSubmit(onSubmit)} disabled={isInitiateRegistrationPending} size="Large" ButtonStyle="Filled" className=" w-full" label={isInitiateRegistrationPending ? "Creating Account..." : "Create Account"} />
                        <View className="gap-10 w-full items-center justify-center">
                            <View style={styles.socialContainer} className="w-full gap-4">
                                <AuthWithSocial isLogin={false} />
                            </View>
                            <View style={styles.loginContainer} className="flex-row items-center gap-1">
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

    formContainer: {
        width: "100%",
    },
    inputContainer: {},
    socialContainer: {
        width: "100%",
        marginTop: 0,
        gap: spacing["4"],
    },
    loginContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["1"],
        marginTop: 0,
    },
});

SignUpScreen.displayName = "SignUpScreen";
