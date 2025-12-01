import { BaseText } from "@/components";
import { headerHeight } from "@/constants/theme";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ArchiveScreen() {
    const insets = useSafeAreaInsets();

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top + headerHeight }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <BaseText type="Title1" weight="600" color="system.black">
                Archive
            </BaseText>
            <BaseText type="Body" color="labels.secondary" style={styles.description}>
                View archived items and data
            </BaseText>
            {/* TODO: Add archive content */}
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
