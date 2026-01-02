import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

interface ActivitiesTabContentProps {
    activities: ActivityLog[];
    isLoading: boolean;
}

export const ActivitiesTabContent: React.FC<ActivitiesTabContentProps> = ({ activities, isLoading }) => {
    const getActivityIcon = (event: string): string => {
        // Map event types to appropriate icons
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

    const getActivityColor = (event: string): string => {
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

    const renderActivityItem = ({ item }: { item: ActivityLog }) => {
        const icon = getActivityIcon(item.event);
        const iconColor = getActivityColor(item.event);

        return (
            <View style={styles.activityItem}>
                <View style={styles.activityContent}>
                    <View style={styles.activityIconContainer}>
                        <IconSymbol name={icon as any} size={20} color={iconColor} />
                    </View>
                    <View style={styles.activityTextContainer}>
                        <BaseText type="Body" weight="400" color="labels.primary" style={styles.activityDescription}>
                            {item.description}
                        </BaseText>
                        <View style={styles.activityMeta}>
                            {item.causer && (
                                <BaseText type="Caption1" weight="400" color="labels.secondary" style={styles.activityMetaText}>
                                    by {item.causer.name}
                                </BaseText>
                            )}
                            {item.causer && item.created_at && <BaseText type="Caption1" color="labels.tertiary" style={styles.activityMetaSeparator}>•</BaseText>}
                            {item.created_at && (
                                <BaseText type="Caption1" weight="400" color="labels.secondary" style={styles.activityMetaText}>
                                    {getRelativeTime(item.created_at)}
                                </BaseText>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <IconSymbol name="clock" color={colors.labels.tertiary} size={64} />
                <BaseText type="Title2" weight="600" color="labels.secondary" style={styles.emptyTitle}>
                    No Activities
                </BaseText>
                <BaseText type="Body" color="labels.tertiary" style={styles.emptyDescription}>
                    This patient doesn't have any activities yet.
                </BaseText>
            </View>
        );
    }

    return (
        <FlatList
            data={activities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        textAlign: "center",
    },
    listContent: {
        paddingVertical: 8,
    },
    activityItem: {
        backgroundColor: colors.system.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
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

