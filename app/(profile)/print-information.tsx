import { BaseText } from "@/components";
import { headerHeight } from "@/constants/theme";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrintInformationScreen() {
    const insets = useSafeAreaInsets();

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top + headerHeight }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <BaseText type="Title1" weight="600" color="system.black">
                Print Information
            </BaseText>
            <BaseText type="Body" color="labels.secondary" style={styles.description}>
                Print settings and information
            </BaseText>
            {/* TODO: Add print information content */}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    description: {
        marginTop: 8,
    },
});
