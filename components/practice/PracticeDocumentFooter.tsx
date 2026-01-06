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

export const PracticeDocumentFooter: React.FC<PracticeDocumentFooterProps> = ({ metadata, printSettings, variant = "document", footerStyle, showIcons = false }) => {
    const hasContent = (printSettings.address && metadata?.address) || (printSettings.practicePhone && metadata?.phone) || (printSettings.practiceEmail && metadata?.email);

    if (!hasContent) {
        return null;
    }

    return (
        <View style={[styles.previewFooter, footerStyle]}>
            <View className="flex-row gap-2 w-full justify-between">
                {printSettings.address && metadata?.address && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="paperplane.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={styles.previewFooterText} numberOfLines={1}>
                            {metadata.address}
                        </BaseText>
                    </View>
                )}
                {printSettings.practiceEmail && metadata?.email && (
                    <View style={[styles.previewFooterItem, styles.previewFooterItemEnd]}>
                        {showIcons && <IconSymbol name="envelope.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={[styles.previewFooterText, { flex: 0 }]} numberOfLines={1}>
                            {metadata.email}
                        </BaseText>
                    </View>
                )}
            </View>
            <View className="flex-row gap-2 w-full justify-between">
                {printSettings.practicePhone && metadata?.phone && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="phone.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={styles.previewFooterText} numberOfLines={1}>
                            {metadata.phone}
                        </BaseText>
                    </View>
                )}
                {printSettings.practiceURL && metadata?.website && (
                    <View style={[styles.previewFooterItem, styles.previewFooterItemEnd]}>
                        {showIcons && <IconSymbol name="globe" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={[styles.previewFooterText, { flex: 0 }]} numberOfLines={1}>
                            {metadata.website}
                        </BaseText>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Preview variant styles
    previewFooter: {
        flexDirection: "column",
        gap: 12,
        padding: 12,
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: colors.system.gray6,
        justifyContent: "space-between",
    },
    previewFooterItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        flexShrink: 1,
        flex: 1,
    },
    previewFooterItemEnd: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        flexShrink: 1,
        flex: 1,
    },
    previewFooterText: {
        fontSize: 8.7,
        lineHeight: 11.4,
        letterSpacing: -0.17,
        flexShrink: 1,
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
