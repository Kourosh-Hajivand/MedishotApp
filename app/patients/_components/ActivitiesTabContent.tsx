import { ActivityItem, BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

interface ActivitiesTabContentProps {
    activities: ActivityLog[];
    isLoading: boolean;
}

export const ActivitiesTabContent: React.FC<ActivitiesTabContentProps> = ({ activities, isLoading }) => {
    const renderActivityItem = ({ item }: { item: ActivityLog }) => {
        return <ActivityItem activity={item} />;
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

    return <FlatList data={activities} renderItem={renderActivityItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />;
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
});
