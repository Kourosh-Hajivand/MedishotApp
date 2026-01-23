import { Skeleton } from "@/components/skeleton/Skeleton";
import colors from "@/theme/colors";
import React from "react";
import { StyleSheet, View } from "react-native";

interface ActivitySkeletonProps {
    showDate?: boolean;
    showBorder?: boolean;
}

export const ActivitySkeleton: React.FC<ActivitySkeletonProps> = ({ showDate = false, showBorder = true }) => {
    return (
        <View>
            {showDate && (
                <View style={styles.dateContainer}>
                    <Skeleton width={100} height={14} borderRadius={4} />
                </View>
            )}
            <View style={[styles.activityItem, !showBorder && styles.activityItemNoBorder]}>
                <View style={styles.activityContent}>
                    {/* Icon skeleton */}
                    <Skeleton width={40} height={40} borderRadius={8} />
                    <View style={styles.activityTextContainer}>
                        {/* Title skeleton */}
                        <Skeleton width="80%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
                        {/* Description skeleton */}
                        <Skeleton width="90%" height={20} borderRadius={4} style={{ marginBottom: 4 }} />
                        {/* Causer skeleton */}
                        <Skeleton width={120} height={18} borderRadius={4} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    dateContainer: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    activityItem: {
        backgroundColor: colors.system.white,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    activityItemNoBorder: {
        borderBottomWidth: 0,
    },
    activityContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    activityTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
});
