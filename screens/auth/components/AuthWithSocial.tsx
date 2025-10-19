import { useGoogleCallback } from "@/utils/hook";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { AppleIcon, GoogleIcon } from "../../../assets/icons";
import { OutlineButton } from "../../../components";
import { BaseText } from "../../../components/text/BaseText";
import { spacing } from "../../../styles/spaces";

WebBrowser.maybeCompleteAuthSession();

export const AuthWithSocial = ({ isLogin }: { isLogin: boolean }) => {
    const [request, response, promptAsync] = Google.useAuthRequest({
        iosClientId: "166893799275-938aoan8338a9ogk67sk09pbu5gm1rpc.apps.googleusercontent.com",
        webClientId: "166893799275-p2drth8lmt6jj5qo5rk1s9vmdfaiut3b.apps.googleusercontent.com",
        scopes: ["profile", "email", "openid"],
        responseType: "code",
        shouldAutoExchangeCode: true,
        usePKCE: false,
    });
    const { mutate: googleCallback } = useGoogleCallback(() => {
        router.replace("/(tabs)/patients");
    });
    useEffect(() => {
        if (response?.type === "success") {
            const { authentication } = response;
            googleCallback(authentication?.idToken || "");
        }
    }, [response]);

    const handleAppleLogin = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
            });

            // appleCallback(credential.identityToken || "");
        } catch (e: any) {
            if (e.code === "ERR_CANCELED") return;
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
