import { storeTokens } from "@/utils/helper/tokenStorage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { AppleIcon, GoogleIcon } from "../../../assets/icons";
import { OutlineButton } from "../../../components";
import { BaseText } from "../../../components/text/BaseText";
import { spacing } from "../../../styles/spaces";

WebBrowser.maybeCompleteAuthSession();

export const AuthWithSocial = ({ isLogin }: { isLogin: boolean }) => {
    // ✅ Google Auth Config
    const [request, response, promptAsync] = Google.useAuthRequest({
        iosClientId: "166893799275-938aoan8338a9ogk67sk09pbu5gm1rpc.apps.googleusercontent.com",
        webClientId: "166893799275-p2drth8lmt6jj5qo5rk1s9vmdfaiut3b.apps.googleusercontent.com",
        scopes: ["profile", "email", "openid"],
        responseType: "code",
        shouldAutoExchangeCode: true,
        // codeChallengeMethod: CodeChallengeMethod.Plain,
        usePKCE: false,
        // codeChallenge: "1234567890",
    });
    console.log("🔗 Google Auth URL:", request?.url);

    // (اختیاری) اتصال به mutation سمت سرور

    // ✅ وقتی لاگین گوگل موفق شد
    useEffect(() => {
        if (response?.type === "success") {
            const { authentication } = response;
            console.log("====================================");
            console.log(response);
            console.log("====================================");
            console.log("✅ Google access token:", authentication?.accessToken);

            // در صورت نیاز ارسال به بک‌اند:
            // socialLogin({ provider: "google", token: authentication?.accessToken });

            // یا ذخیره‌ی مستقیم در local storage
            storeTokens(authentication?.accessToken || "");
        }
    }, [response]);

    // ✅ Apple login handler
    const handleAppleLogin = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
            });
            console.log("✅ Apple identity token:", credential.identityToken);

            // ارسال به سرور یا ذخیره
            // socialLogin({ provider: "apple", token: credential.identityToken });
            storeTokens(credential.identityToken || "");
        } catch (e: any) {
            if (e.code === "ERR_CANCELED") return;
            console.error("❌ Apple login error:", e);
        }
    };

    return (
        <View style={styles.container}>
            {/* 🍎 APPLE */}
            <OutlineButton onPress={handleAppleLogin}>
                <AppleIcon strokeWidth={0} />
                <BaseText type="Headline" color="system.black" weight="500">
                    {isLogin ? "Sign in with Apple" : "Sign up with Apple"}
                </BaseText>
            </OutlineButton>

            {/* 🔥 GOOGLE */}
            <OutlineButton disabled={!request} onPress={() => promptAsync()}>
                <GoogleIcon strokeWidth={0} />
                <BaseText type="Headline" color="system.black" weight="500">
                    {isLogin ? "Sign in with Google" : "Sign up with Google"}
                </BaseText>
            </OutlineButton>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing["4"],
    },
});
