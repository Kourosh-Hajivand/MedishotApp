import { headerHeight } from "@/constants/theme";
import { Host, Switch, VStack } from "@expo/ui/swift-ui";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationScreen() {
    const insets = useSafeAreaInsets();

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Host style={{ flex: 1, paddingTop: insets.top + headerHeight + 100 }}>
                <VStack spacing={16}>
                    <Switch label="Enable notifications" variant="switch" value={true} onValueChange={() => {}} />
                    <Switch label="Image Added" variant="switch" value={true} onValueChange={() => {}} />
                    <Switch label="Note's" variant="switch" value={true} onValueChange={() => {}} />
                    <Switch label="Image Enhanced" variant="switch" value={true} onValueChange={() => {}} />
                    <Switch label="Consent Filled" variant="switch" value={true} onValueChange={() => {}} />
                    <Switch label="Patient Added" variant="switch" value={true} onValueChange={() => {}} />
                </VStack>
            </Host>
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
