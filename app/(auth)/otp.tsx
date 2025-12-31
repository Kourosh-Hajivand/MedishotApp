import { BaseButton, BaseText, KeyboardAwareScrollView, OTPInput } from "@/components";
import { storeTokens } from "@/utils/helper/tokenStorage";
import { useCompleteRegistration, useInitiateRegistration, useVerifyOtpCode } from "@/utils/hook";
import { Button, Host } from "@expo/ui/swift-ui";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OTPScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const email = (params.email as string) || "";

    const [otp, setOtp] = useState("");
    const [error, setError] = useState<string>();
    const [timer, setTimer] = useState(120); // 2 minutes = 120 seconds
    const [canResend, setCanResend] = useState(false);

    const navigation = useNavigation();
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 65, height: 35 }}>
                    <Button disabled={otp.length !== 6}>Next</Button>
                </Host>
            ),
        });
    }, [navigation]);
    // Timer countdown
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [timer]);

    const { mutate: resendCode, isPending: isResending } = useInitiateRegistration(
        () => {
            setTimer(120);
            setCanResend(false);
            setError(undefined);
        },
        (error) => {
            setError(error.message);
        },
    );

    const { mutate: verifyCode, isPending: isVerifying } = useCompleteRegistration(
        async (response) => {
            await storeTokens(response.data.token);

            const hasCompletedProfile = response.data.people.first_name && response.data.people.last_name;

            if (hasCompletedProfile) {
                router.push("/(auth)/select-role");
            } else {
                router.push("/(auth)/completeProfile");
            }
        },
        (error) => {
            setError(error.message);
        },
    );

    const { mutate: verifyOtpCode, isPending: isVerifyingOtpCode } = useVerifyOtpCode(() => {
        router.push("/(auth)/new-password");
    });

    const handleResend = () => {
        if (!canResend || !email) return;
        resendCode({ email });
    };
    useEffect(() => {
        if (otp.length === 6) {
            if (params.forgetPassword) {
                verifyOtpCode({ email, code: otp });
            } else {
                verifyCode({ email, verification_code: otp, password: params.password as string, password_confirmation: params.password as string });
            }
        }
    }, [otp]);

    // Format timer display (mm:ss)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
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
                            Enter Verification code
                        </BaseText>
                        <View>
                            <BaseText type="Subhead" weight="300" color="system.black" className="!text-center">
                                Enter the 4 digit code sent to your email
                            </BaseText>
                            <BaseText type="Subhead" weight="400" color="system.blue" className="!text-center">
                                {email || "No email provided"}
                            </BaseText>
                        </View>
                    </View>
                    <View className="max-w-[450px] mx-auto gap-10">
                        <OTPInput
                            length={6}
                            value={otp}
                            onChange={(value) => {
                                setOtp(value);
                                setError(undefined);
                            }}
                            error={error}
                            disabled={isVerifying}
                        />

                        <View className="gap-2 items-center">
                            <BaseButton ButtonStyle="Gray" size="Small" label={isResending ? "Sending..." : timer ? `Resend code ${timer > 0 ? `in ${formatTime(timer)}` : "Resend code"}` : "Resend code"} className="!rounded-full !w-fit mx-auto" onPress={handleResend} disabled={!canResend || isResending} />
                        </View>
                    </View>
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
}
