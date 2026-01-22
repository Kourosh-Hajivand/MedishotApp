import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import React from "react";
import { StyleSheet, View } from "react-native";
import { AvatarSkeleton } from "./AvatarSkeleton";
import { Skeleton } from "./Skeleton";

interface PatientSkeletonProps {
    haveRing?: boolean;
}

export const PatientSkeleton: React.FC<PatientSkeletonProps> = ({
    haveRing = false,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <AvatarSkeleton size={36} haveRing={haveRing} />
                <View style={styles.textContainer}>
                    <Skeleton width={120} height={16} borderRadius={4} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing["2"],
        paddingHorizontal: spacing["4"],
        backgroundColor: colors.system.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.system.gray5,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["3"],
        flex: 1,
    },
    textContainer: {
        flex: 1,
        justifyContent: "center",
    },
});
