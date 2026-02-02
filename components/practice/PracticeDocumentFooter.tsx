import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
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
    const hasContent =
        (printSettings.address && metadata?.address) ||
        (printSettings.practicePhone && metadata?.phone) ||
        (printSettings.practiceEmail && metadata?.email) ||
        (printSettings.practiceURL && metadata?.website);

    if (!hasContent) {
        return null;
    }

    const isDocument = variant === "document";
    const containerStyle = isDocument ? styles.documentFooter : styles.previewFooter;
    const textStyle = isDocument ? styles.documentFooterText : styles.previewFooterText;
    const showIconsInDocument = showIcons || isDocument;

    if (isDocument) {
        return (
            <View style={[containerStyle, footerStyle]} className="w-full">
                <View style={styles.documentFooterRow}>
                    <View style={styles.documentFooterItemLeft}>
                        {printSettings.address && metadata?.address && (
                            <View style={styles.documentFooterItemRow}>
                                {showIconsInDocument && <IconSymbol name="paperplane.fill" size={10} color={colors.system.gray2} />}
                                <BaseText type="Caption2" color="labels.primary" style={textStyle} numberOfLines={2}>
                                    {metadata.address}
                                </BaseText>
                            </View>
                        )}
                        {printSettings.practicePhone && metadata?.phone && (
                            <View style={styles.documentFooterItemRow}>
                                {showIconsInDocument && <IconSymbol name="phone.fill" size={10} color={colors.system.gray2} />}
                                <BaseText type="Caption2" color="labels.primary" style={textStyle} numberOfLines={1}>
                                    {e164ToDisplay(metadata.phone) || metadata.phone}
                                </BaseText>
                            </View>
                        )}
                    </View>
                    <View style={styles.documentFooterItemRight}>
                        {printSettings.practiceEmail && metadata?.email && (
                            <View style={styles.documentFooterItemRow}>
                                {showIconsInDocument && <IconSymbol name="envelope.fill" size={10} color={colors.system.gray2} />}
                                <BaseText type="Caption2" color="labels.primary" style={textStyle} numberOfLines={1}>
                                    {metadata.email}
                                </BaseText>
                            </View>
                        )}
                        {printSettings.practiceURL && metadata?.website && (
                            <View style={styles.documentFooterItemRow}>
                                {showIconsInDocument && <IconSymbol name="globe" size={10} color={colors.system.gray2} />}
                                <BaseText type="Caption2" color="labels.primary" style={textStyle} numberOfLines={1}>
                                    {metadata.website}
                                </BaseText>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[containerStyle, footerStyle]} className="w-full">
            <View className="flex-row gap-2 w-full justify-between">
                {printSettings.address && metadata?.address && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="paperplane.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={textStyle} numberOfLines={1}>
                            {metadata.address}
                        </BaseText>
                    </View>
                )}
                {printSettings.practiceEmail && metadata?.email && (
                    <View style={[styles.previewFooterItem, styles.previewFooterItemEnd]}>
                        {showIcons && <IconSymbol name="envelope.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={[textStyle, { flex: 0 }]} numberOfLines={1}>
                            {metadata.email}
                        </BaseText>
                    </View>
                )}
            </View>
            <View className="flex-row gap-2 w-full justify-between">
                {printSettings.practicePhone && metadata?.phone && (
                    <View style={styles.previewFooterItem}>
                        {showIcons && <IconSymbol name="phone.fill" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={textStyle} numberOfLines={1}>
                            {e164ToDisplay(metadata.phone) || metadata.phone}
                        </BaseText>
                    </View>
                )}
                {printSettings.practiceURL && metadata?.website && (
                    <View style={[styles.previewFooterItem, styles.previewFooterItemEnd]}>
                        {showIcons && <IconSymbol name="globe" size={10} color={colors.system.gray2} />}
                        <BaseText type="Caption2" color="labels.primary" style={[textStyle, { flex: 0 }]} numberOfLines={1}>
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
        paddingTop: 15,
        paddingBottom: 15,
        borderTopWidth: 1,
        borderTopColor: colors.system.gray6,
    },
    documentFooterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 20,
    },
    documentFooterItemLeft: {
        flex: 1,
    },
    documentFooterItemRight: {
        flex: 1,
        alignItems: "flex-end",
    },
    documentFooterItemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    documentFooterText: {
        fontSize: 9,
        lineHeight: 14,
    },
});
