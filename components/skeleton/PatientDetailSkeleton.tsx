import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { AvatarSkeleton } from "./AvatarSkeleton";
import { Skeleton } from "./Skeleton";

const screenWidth = Dimensions.get("window").width;
const itemWidth = (screenWidth - spacing["5"] * 2 - spacing["2"] * 2) / 3;

export const PatientDetailSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <AvatarSkeleton size={100} haveRing />
                <View style={styles.nameContainer}>
                    <Skeleton width={180} height={28} borderRadius={4} />
                    <View style={styles.subtitleContainer}>
                        <Skeleton width={140} height={16} borderRadius={4} />
                    </View>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <View style={styles.actionCard}>
                    <View style={styles.actionItem}>
                        <Skeleton width={26} height={26} borderRadius={13} variant="circular" />
                        <Skeleton width={70} height={14} borderRadius={4} />
                    </View>
                    <View style={styles.actionDivider} />
                    <View style={styles.actionItem}>
                        <Skeleton width={26} height={26} borderRadius={13} variant="circular" />
                        <Skeleton width={70} height={14} borderRadius={4} />
                    </View>
                    <View style={styles.actionDivider} />
                    <View style={styles.actionItem}>
                        <Skeleton width={26} height={26} borderRadius={13} variant="circular" />
                        <Skeleton width={50} height={14} borderRadius={4} />
                    </View>
                </View>
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Skeleton width={50} height={14} borderRadius={4} />
                        <Skeleton width={120} height={16} borderRadius={4} style={styles.infoValue} />
                    </View>
                    <View style={styles.infoButtons}>
                        <Skeleton width={30} height={30} borderRadius={15} variant="circular" />
                        <Skeleton width={30} height={30} borderRadius={15} variant="circular" />
                    </View>
                </View>
                <View style={styles.infoRowBottom}>
                    <View style={styles.infoItem}>
                        <Skeleton width={90} height={14} borderRadius={4} />
                        <Skeleton width={140} height={16} borderRadius={4} style={styles.infoValue} />
                    </View>
                    <View style={[styles.infoItem, styles.infoItemBorderLeft]}>
                        <Skeleton width={100} height={14} borderRadius={4} />
                        <Skeleton width={60} height={16} borderRadius={4} style={styles.infoValue} />
                    </View>
                </View>
            </View>

            <View style={styles.detailsCard}>
                <Skeleton width={120} height={18} borderRadius={4} />
                <Skeleton width={16} height={16} borderRadius={8} variant="circular" />
            </View>

            <View style={styles.tabsContainer}>
                <View style={styles.tabs}>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <View key={index} style={styles.tabItem}>
                            <Skeleton width={60} height={18} borderRadius={4} />
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.contentGrid}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <View key={index} style={styles.gridItem}>
                            <Skeleton width="100%" height="100%" borderRadius={12} variant="rounded" />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.gray6,
    },
    header: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing["6"],
        paddingTop: spacing["4"],
    },
    nameContainer: {
        alignItems: "center",
        marginTop: spacing["2.5"],
    },
    subtitleContainer: {
        marginTop: spacing["1"],
    },
    actionsContainer: {
        marginBottom: spacing["5"],
        paddingHorizontal: spacing["5"],
    },
    actionCard: {
        width: "100%",
        height: 76,
        backgroundColor: colors.system.white,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    actionItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing["2"],
    },
    actionDivider: {
        width: 1,
        height: "60%",
        backgroundColor: colors.border,
    },
    infoItemBorderLeft: {
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        paddingLeft: spacing["3"],
    },
    infoCard: {
        backgroundColor: colors.system.white,
        borderRadius: 12,
        padding: spacing["4"],
        marginBottom: spacing["5"],
        marginHorizontal: spacing["5"],
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: spacing["2"],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    infoRowBottom: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingTop: spacing["2"],
    },
    infoItem: {
        flex: 1,
    },
    infoValue: {
        marginTop: spacing["0.5"],
    },
    infoButtons: {
        flexDirection: "row",
        gap: spacing["3"],
    },
    detailsCard: {
        backgroundColor: colors.system.white,
        borderRadius: 12,
        padding: spacing["4"],
        marginBottom: spacing["5"],
        marginHorizontal: spacing["5"],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    tabsContainer: {
        backgroundColor: colors.system.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tabs: {
        flexDirection: "row",
        paddingHorizontal: spacing["5"],
        paddingVertical: spacing["3"],
    },
    tabItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    contentContainer: {
        flex: 1,
        backgroundColor: colors.system.white,
        paddingTop: spacing["4"],
        minHeight: 400,
    },
    contentGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing["2"],
        paddingHorizontal: spacing["4"],
    },
    gridItem: {
        width: "48%",
        aspectRatio: 1,
    },
});
