import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import colors from "@/theme/colors";
import { People, Practice } from "@/utils/service/models/ResponseModels";
import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";

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

interface PracticeDocumentHeaderProps {
    practice: Practice;
    printSettings: PracticeSettings;
    doctor?: People | null;
    me?: People | null;
    variant?: "preview" | "document";
    headerStyle?: ViewStyle;
}

export const PracticeDocumentHeader: React.FC<PracticeDocumentHeaderProps> = ({ practice, printSettings, doctor, me, variant = "document", headerStyle }) => {
    const avatarSize = variant === "preview" ? 33 : 50;
    const showDate = true;

    // Determine which doctor to show
    const displayDoctor = doctor || me;

    return (
        <View style={[variant === "preview" ? styles.previewHeader : styles.documentHeader, headerStyle]}>
            <View style={variant === "preview" ? styles.previewHeaderLeft : styles.documentHeaderLeft}>
                {printSettings.avatar === "logo" && practice.image?.url ? (
                    <Image source={{ uri: practice.image.url }} style={[variant === "preview" ? styles.previewAvatar : styles.documentAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
                ) : printSettings.avatar === "profile_picture" && me?.profile_photo_url ? (
                    <Avatar name={`${me?.first_name} ${me?.last_name}`} size={avatarSize} imageUrl={me?.profile_photo_url || undefined} />
                ) : null}
                <View style={variant === "preview" ? styles.previewHeaderText : styles.documentHeaderText}>
                    {printSettings.practiceName && practice.name && (
                        <BaseText type="Subhead" weight={variant === "preview" ? "600" : 600} color="labels.primary" style={variant === "preview" ? styles.previewPracticeName : styles.documentPracticeName}>
                            {practice.name}
                        </BaseText>
                    )}
                    {printSettings.doctorName && displayDoctor && (
                        <BaseText
                            type={printSettings.practiceName && practice.name ? "Caption2" : "Subhead"}
                            weight={printSettings.practiceName && practice.name ? "400" : "600"}
                            color={printSettings.practiceName && practice.name ? "labels.secondary" : "labels.primary"}
                            style={variant === "preview" ? styles.previewDoctorName : styles.documentDoctorName}
                        >
                            Dr. {displayDoctor.first_name} {displayDoctor.last_name}
                        </BaseText>
                    )}
                </View>
            </View>
            {showDate && (
                <View style={variant === "preview" ? styles.previewDateContainer : styles.documentDateContainer}>
                    <BaseText type={variant === "preview" ? "Caption2" : "Caption1"} color={variant === "preview" ? "labels.primary" : "system.blue"} style={variant === "preview" ? styles.previewDate : styles.documentDate}>
                        Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </BaseText>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Preview variant styles
    previewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.system.gray6,
    },
    previewHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    previewAvatar: {
        width: 33,
        height: 33,
        borderRadius: 16.5,
    },
    previewHeaderText: {
        flex: 1,
        gap: 1,
    },
    previewPracticeName: {
        fontSize: 8.7,
        lineHeight: 11.4,
        letterSpacing: -0.17,
    },
    previewDoctorName: {
        fontSize: 7,
        lineHeight: 9.8,
        letterSpacing: -0.044,
    },
    previewDateContainer: {
        alignItems: "flex-end",
    },
    previewDate: {
        fontSize: 8.7,
        lineHeight: 11.4,
        letterSpacing: -0.17,
    },
    // Document variant styles
    documentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    documentHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    documentAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    documentHeaderText: {
        gap: 4,
    },
    documentPracticeName: {
        fontSize: 14,
    },
    documentDoctorName: {
        fontSize: 11,
    },
    documentDateContainer: {},
    documentDate: {
        fontSize: 10,
    },
});
