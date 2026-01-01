import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

export interface PracticeSettings {
    avatar: "profile_picture" | "logo";
    practiceName: boolean;
    doctorName: boolean;
    address?: boolean;
    practicePhone?: boolean;
    practiceURL?: boolean;
    practiceEmail?: boolean;
    practiceSocialMedia?: boolean;
}

interface PracticeMetadata {
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    zipcode?: number;
    logo?: string;
}

interface PracticeDocumentFooterProps {
    metadata?: PracticeMetadata | null;
    printSettings: PracticeSettings;
    variant?: "preview" | "document";
    footerStyle?: ViewStyle;
    showIcons?: boolean;
}

export const PracticeDocumentFooter: React.FC<PracticeDocumentFooterProps> = ({
    metadata,
    printSettings,
    variant = "document",
    footerStyle,
    showIcons = false,
}) => {
    const hasContent = (printSettings.address && metadata?.address) || (printSettings.practicePhone && metadata?.phone) || (printSettings.practiceEmail && metadata?.email);

    if (!hasContent) {
        return null;
    }

    if (variant === "preview") {
        return (
            <View style={[styles.previewFooter, footerStyle]}>
                {printSettings.address && metadata?.address && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="paperplane.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={styles.previewFooterText} numberOfLines={1}>
                            {metadata.address}
                        </BaseText>
                    </View>
                )}
                {printSettings.practiceEmail && metadata?.email && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="envelope.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={styles.previewFooterText} numberOfLines={1}>
                            {metadata.email}
                        </BaseText>
                    </View>
                )}
                {printSettings.practicePhone && metadata?.phone && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="phone.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={styles.previewFooterText} numberOfLines={1}>
                            {metadata.phone}
                        </BaseText>
                    </View>
                )}
            </View>
        );
    }

    // Document variant
    return (
        <View style={[styles.documentFooter, footerStyle]}>
            {printSettings.address && metadata?.address && (
                <View style={styles.documentFooterItemLeft}>
                    <BaseText type="Caption2" color="labels.primary" style={styles.documentFooterText}>
                        {metadata.address}
                    </BaseText>
                </View>
            )}
            {printSettings.practicePhone && metadata?.phone && (
                <View style={styles.documentFooterItemRight}>
                    <BaseText type="Caption2" color="labels.primary" style={styles.documentFooterText}>
                        Phone: {metadata.phone}
                    </BaseText>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Preview variant styles
    previewFooter: {
        flexDirection: "row",
        gap: 12,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: colors.system.gray6,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    previewFooterItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        flexShrink: 1,
    },
    previewFooterText: {
        fontSize: 8.7,
        lineHeight: 11.4,
        letterSpacing: -0.17,
        flex: 1,
    },
    // Document variant styles
    documentFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingTop: 15,
        paddingBottom: 15,
    },
    documentFooterItemLeft: {
        flex: 1,
        marginRight: 20,
    },
    documentFooterItemRight: {
        flex: 1,
        marginLeft: 20,
        alignItems: "flex-end",
    },
    documentFooterText: {
        fontSize: 9,
        lineHeight: 14,
    },
});

