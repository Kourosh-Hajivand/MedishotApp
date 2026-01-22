import React from "react";
import { StyleSheet, View } from "react-native";
import { PatientSkeleton } from "./PatientSkeleton";
import { BaseText } from "../text/BaseText";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";

interface PatientListSkeletonProps {
    count?: number;
    showSectionHeader?: boolean;
    sectionTitle?: string;
}

export const PatientListSkeleton: React.FC<PatientListSkeletonProps> = ({
    count = 10,
    showSectionHeader = false,
    sectionTitle,
}) => {
    return (
        <View style={styles.container}>
            {showSectionHeader && (
                <View style={styles.sectionHeader}>
                    <BaseText type="Footnote" color="labels.tertiary" weight="600">
                        {sectionTitle || "A"}
                    </BaseText>
                </View>
            )}
            {Array.from({ length: count }).map((_, index) => (
                <PatientSkeleton key={index} haveRing={index % 3 === 0} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.system.white,
    },
    sectionHeader: {
        backgroundColor: colors.background,
        paddingHorizontal: spacing["4"],
        paddingVertical: spacing["1"],
    },
});
