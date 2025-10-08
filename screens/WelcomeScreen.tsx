import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BaseButton, BaseText } from "../components";
import { spacing } from "../styles/spaces";
import colors from "../theme/colors.shared.js";

export const WelcomeScreen: React.FC = () => {
    const router = useRouter();
    const video = React.useRef<Video>(null);

    const handleContinue = () => {
        router.push("/(auth)/signup");
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.videoContainer}>
                    <Video ref={video} source={require("../assets/Welcome.mp4")} style={styles.video} resizeMode={ResizeMode.COVER} isLooping={false} shouldPlay isMuted />
                </View>

                <View style={styles.bottomContent}>
                    <View style={styles.textContainer}>
                        <BaseText type="Title1" color="system.black" weight={"700"}>
                            Welcome to Medishots
                        </BaseText>
                        <BaseText type="Title3" color="system.black" align="center" weight={"400"} style={{ width: 280 }}>
                            AI-powered tools for better patient photo management.
                        </BaseText>
                    </View>
                    <BaseButton ButtonStyle="Filled" size="Large" label="Continue" className="!rounded-2xl" onPress={handleContinue} />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    mainContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: spacing["10"],
        paddingBottom: spacing["24"],
    },
    videoContainer: {
        width: "100%",
        height: "50%",
    },
    video: {
        width: "100%",
        height: "100%",
    },
    bottomContent: {
        gap: spacing["24"],
        width: "100%",
        paddingHorizontal: spacing["10"],
    },
    textContainer: {
        gap: spacing["7"],
        alignItems: "center",
        justifyContent: "center",
    },
});
