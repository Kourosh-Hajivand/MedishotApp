import { BaseText } from "@/components/text/BaseText";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { formatDate } from "@/utils/helper/dateUtils";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import { LinearGradient } from "expo-linear-gradient";
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
        
        // Check for specific event types first
        if (eventLower.includes("appointment") || eventLower.includes("scheduled")) {
            return "calendar";
        }
        if (eventLower.includes("patient_created") || (eventLower.includes("patient") && eventLower.includes("created"))) {
            return "person.badge.plus.fill";
        }
        if (eventLower.includes("patient_updated") || (eventLower.includes("patient") && eventLower.includes("updated"))) {
            return "person.crop.circle.badge.checkmark";
        }
        if (eventLower.includes("patient_deleted") || (eventLower.includes("patient") && eventLower.includes("deleted"))) {
            return "person.crop.circle.badge.minus";
        }
        if (eventLower.includes("upload") || eventLower.includes("media") || eventLower.includes("image")) {
            return "photo.badge.plus.fill";
        }
        if (eventLower.includes("consent") || eventLower.includes("contract")) {
            return "doc.text.fill";
        }
        if (eventLower.includes("created") || eventLower.includes("create")) {
            return "plus.circle.fill";
        }
        if (eventLower.includes("updated") || eventLower.includes("update")) {
            return "pencil.circle.fill";
        }
        if (eventLower.includes("deleted") || eventLower.includes("delete")) {
            return "trash.circle.fill";
        }
        return "circle.fill";
    };

    const getActivityColor = (event?: string | null): string => {
        if (!event) return colors.system.gray;
        const eventLower = event.toLowerCase();
        
        // Check for specific event types first
        if (eventLower.includes("appointment") || eventLower.includes("scheduled")) {
            return "#FF3B30"; // Red color for appointment
        }
        if (eventLower.includes("patient_created") || (eventLower.includes("patient") && eventLower.includes("created"))) {
            return colors.system.green;
        }
        if (eventLower.includes("patient_updated") || (eventLower.includes("patient") && eventLower.includes("updated"))) {
            return colors.system.blue;
        }
        if (eventLower.includes("patient_deleted") || (eventLower.includes("patient") && eventLower.includes("deleted"))) {
            return colors.system.red;
        }
        if (eventLower.includes("upload") || eventLower.includes("media") || eventLower.includes("image")) {
            return colors.system.purple;
        }
        if (eventLower.includes("consent") || eventLower.includes("contract")) {
            return colors.system.orange;
        }
        if (eventLower.includes("created") || eventLower.includes("create")) {
            return colors.system.green;
        }
        if (eventLower.includes("updated") || eventLower.includes("update")) {
            return colors.system.blue;
        }
        if (eventLower.includes("deleted") || eventLower.includes("delete")) {
            return colors.system.red;
        }
        return colors.system.gray;
    };

    const getActivityIconBackgroundColor = (iconColor: string): string => {
        // Light background colors matching the icon colors
        if (iconColor === "#FF3B30") return "#FFE5E5"; // Light pink/red for appointment
        if (iconColor === colors.system.green) return "#E5F5E5";
        if (iconColor === colors.system.blue) return "#E5F0FF";
        if (iconColor === colors.system.red) return "#FFE5E5";
        if (iconColor === colors.system.purple) return "#F0E5FF";
        if (iconColor === colors.system.orange) return "#FFF0E5";
        return colors.system.gray6;
    };

    // Use description if event is not available
    const activityType = activity.event || activity.description || "";
    const icon = getActivityIcon(activityType);
    const iconColor = getActivityColor(activityType);

    const activityDate = activity.updated_at || activity.created_at;
    const formattedDate = activityDate ? formatDate(activityDate) : "";

    return (
        <View>
            {formattedDate && (
                <LinearGradient colors={["rgba(255, 255, 255, 0.08)", "rgba(120, 120, 128, 0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ paddingHorizontal: 16, paddingVertical: 4, zIndex: 0 }} className="w-full">
                    <BaseText type="Footnote" weight="600" color="labels.tertiary">
                        {formattedDate}
                    </BaseText>
                </LinearGradient>
            )}
            <View style={[styles.activityItem, !showBorder && styles.activityItemNoBorder]} className="p-4">
                <View style={styles.activityContent}>
                    <View style={[styles.activityIconContainer, { backgroundColor: getActivityIconBackgroundColor(iconColor) }]}>
                        <IconSymbol name={icon as any} size={24} color={iconColor} />
                    </View>
                    <View style={styles.activityTextContainer}>
                        {activity.title && (
                            <BaseText type="Body" weight="400" color={activity.description ? "labels.secondary" : "labels.primary"} style={styles.activityDescription}>
                                {activity.title}
                            </BaseText>
                        )}
                        {activity.description && (
                            <BaseText type="Body" weight="400" color="labels.primary" style={styles.activityDescription}>
                                {activity.description}
                            </BaseText>
                        )}
                        {activity.causer && (
                            <BaseText type="Caption1" weight="400" color={activity.description ? "labels.tertiary" : "labels.secondary"}  style={styles.activityMetaText}>
                                by {activity.causer.name}
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
        zIndex: 10,
        borderBottomColor: colors.border,
    },
    activityItemNoBorder: {
        borderBottomWidth: 0,
    },
    activityContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    activityIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
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
    activityMetaText: {
        fontSize: 13,
        lineHeight: 18,
        letterSpacing: -0.08,
    },
});
