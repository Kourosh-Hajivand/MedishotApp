import { BaseText } from "@/components/text/BaseText";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import React from "react";
import { StyleSheet, View } from "react-native";

interface ActivityItemProps {
    activity: ActivityLog;
    showBorder?: boolean;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, showBorder = true }) => {
    const getActivityIcon = (event?: string | null): string => {
        // Map event types to appropriate icons
        if (!event) return "circle.fill";
        const eventLower = event.toLowerCase();
        if (eventLower.includes("created") || eventLower.includes("create")) {
            return "plus.circle.fill";
        }
        if (eventLower.includes("updated") || eventLower.includes("update")) {
            return "pencil.circle.fill";
        }
        if (eventLower.includes("deleted") || eventLower.includes("delete")) {
            return "trash.circle.fill";
        }
        if (eventLower.includes("upload") || eventLower.includes("media")) {
            return "photo.circle.fill";
        }
        if (eventLower.includes("consent") || eventLower.includes("contract")) {
            return "doc.text.fill";
        }
        return "circle.fill";
    };

    const getActivityColor = (event?: string | null): string => {
        if (!event) return colors.system.gray;
        const eventLower = event.toLowerCase();
        if (eventLower.includes("created") || eventLower.includes("create")) {
            return colors.system.green;
        }
        if (eventLower.includes("updated") || eventLower.includes("update")) {
            return colors.system.blue;
        }
        if (eventLower.includes("deleted") || eventLower.includes("delete")) {
            return colors.system.red;
        }
        if (eventLower.includes("upload") || eventLower.includes("media")) {
            return colors.system.purple;
        }
        if (eventLower.includes("consent") || eventLower.includes("contract")) {
            return colors.system.orange;
        }
        return colors.system.gray;
    };

    const icon = getActivityIcon(activity.event);
    const iconColor = getActivityColor(activity.event);

    return (
        <View style={[styles.activityItem, !showBorder && styles.activityItemNoBorder]}>
            <View style={styles.activityContent}>
                <View style={styles.activityIconContainer}>
                    <IconSymbol name={icon as any} size={20} color={iconColor} />
                </View>
                <View style={styles.activityTextContainer}>
                    <BaseText type="Body" weight="400" color="labels.primary" style={styles.activityDescription}>
                        {activity.description}
                    </BaseText>
                    <View style={styles.activityMeta}>
                        {activity.causer && (
                            <BaseText type="Caption1" weight="400" color="labels.secondary" style={styles.activityMetaText}>
                                by {activity.causer.name}
                            </BaseText>
                        )}
                        {activity.causer && activity.created_at && <BaseText type="Caption1" color="labels.tertiary" style={styles.activityMetaSeparator}>•</BaseText>}
                        {activity.created_at && (
                            <BaseText type="Caption1" weight="400" color="labels.secondary" style={styles.activityMetaText}>
                                {getRelativeTime(activity.created_at)}
                            </BaseText>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    activityItem: {
        backgroundColor: colors.system.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    activityItemNoBorder: {
        borderBottomWidth: 0,
    },
    activityContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    activityIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.system.gray6,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        marginTop: 2,
    },
    activityTextContainer: {
        flex: 1,
    },
    activityDescription: {
        fontSize: 15,
        lineHeight: 20,
        letterSpacing: -0.24,
        marginBottom: 4,
    },
    activityMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityMetaText: {
        fontSize: 13,
        lineHeight: 18,
        letterSpacing: -0.08,
    },
    activityMetaSeparator: {
        marginHorizontal: 6,
        fontSize: 13,
    },
});

