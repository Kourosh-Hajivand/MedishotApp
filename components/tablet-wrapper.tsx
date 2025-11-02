import React from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";

export interface TabletWrapperProps extends ViewProps {
    /**
     * Maximum width for tablet (default: 600)
     */
    maxWidth?: number;
    /**
     * Alignment when content is centered (default: center)
     */
    align?: "center" | "left" | "right";
    /**
     * Background color for side areas on tablet
     */
    sideBackgroundColor?: string;
}

/**
 * Wrapper component that applies max width for tablets
 * Useful for preventing content from becoming too wide on large screens
 */
export function TabletWrapper({ children, maxWidth = 600, align = "center", sideBackgroundColor = "#ffffff", style, ...props }: TabletWrapperProps) {
    if (Platform.OS === "ios") {
        // On mobile, just render children without wrapper
        return <>{children}</>;
    }

    const alignStyles = {
        center: { alignItems: "center" as const },
        left: { alignItems: "flex-start" as const },
        right: { alignItems: "flex-end" as const },
    };

    return (
        <View style={[styles.container, { backgroundColor: sideBackgroundColor }, style]} {...props}>
            <View style={[styles.content, { maxWidth }, alignStyles[align]]}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
    },
    content: {
        flex: 1,
        width: "100%",
    },
});
