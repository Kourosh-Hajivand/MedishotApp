import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
// import {WebView} from 'react-native-webview';
import { SafeAreaView } from "react-native-safe-area-context";
import { AppleIcon, GoogleIcon } from "../../../assets/icons";
import { OutlineButton } from "../../../components";
import { BaseText } from "../../../components/text/BaseText";
import { routes } from "../../../routes/routes";
import { spacing } from "../../../styles/spaces";
// import {appleAuth} from '@invertase/react-native-apple-authentication';
export const AuthWithSocial = ({ isLogin }: { isLogin: boolean }) => {
    const [webviewUrl, setWebviewUrl] = useState<string | null>(null);

    const {
        baseUrl,
        auth: { apple, google },
    } = routes;

    // const handleAppleSignIn = async () => {
    //   try {
    //     const response = await appleAuth.performRequest({
    //       requestedOperation: appleAuth.Operation.LOGIN,
    //       requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    //     });

    //     const {identityToken, user, email, fullName} = response;

    //     if (!identityToken) {
    //       throw new Error('Apple Sign-In failed - no identity token returned');
    //     }

    //     console.log('✅ Apple Sign-In success:', {
    //       identityToken,
    //       user,
    //       email,
    //       fullName,
    //     });
    //   } catch (error) {
    //     console.log('❌ Apple Sign-In error:', error);
    //   }
    // };

    return (
        <View style={styles.container}>
            <OutlineButton onPress={() => {}}>
                <AppleIcon strokeWidth={0} />
                <BaseText type="Headline" color="system.black" weight="500">
                    {isLogin ? "Sign in with Apple" : "Sign up with Apple"}
                </BaseText>
            </OutlineButton>
            <OutlineButton onPress={() => setWebviewUrl(baseUrl + google())}>
                <GoogleIcon strokeWidth={0} />
                <BaseText type="Headline" color="system.black" weight="500">
                    {isLogin ? "Sign in with Google" : "Sign up with Google"}
                </BaseText>
            </OutlineButton>

            <Modal visible={!!webviewUrl} animationType="slide" style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
                    <TouchableOpacity onPress={() => setWebviewUrl(null)} style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
                        <View>
                            <BaseText type="Body" weight={400} color="system.blue">
                                Cancel
                            </BaseText>
                        </View>
                    </TouchableOpacity>

                    {/* {webviewUrl && (
            <WebView
              style={{flex: 1}}
              source={{uri: webviewUrl}}
              startInLoadingState
            />
          )} */}
                </SafeAreaView>
            </Modal>
        </View>
    );
};

AuthWithSocial.displayName = "AuthWithSocial";

const styles = StyleSheet.create({
    container: {
        gap: spacing["4"],
    },
});
