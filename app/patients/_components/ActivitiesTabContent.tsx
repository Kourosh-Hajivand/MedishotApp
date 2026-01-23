import { ActivityItem, BaseText, ErrorState } from "@/components";
import { ActivitySkeleton } from "@/components/skeleton/ActivitySkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import React, { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ActivitiesTabContentProps {
    activities: ActivityLog[];
    isLoading: boolean;
    error?: Error | null;
    isError?: boolean;
    onRetry?: () => void;
}

export const ActivitiesTabContent: React.FC<ActivitiesTabContentProps> = React.memo(({ activities, isLoading, error, isError, onRetry }) => {
    const insets = useSafeAreaInsets();

    const renderActivityItem = useCallback(({ item }: { item: ActivityLog }) => {
        return <ActivityItem activity={item} />;
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                {Array.from({ length: 5 }).map((_, index) => (
                    <ActivitySkeleton key={`skeleton-${index}`} showDate={index === 0 || index === 2} showBorder={index < 4} />
                ))}
            </View>
        );
    }

    if (isError) {
        return (
            <ErrorState 
                message={(error as any)?.message || "Failed to load activities"} 
                onRetry={onRetry} 
                title="Failed to load activities"
            />
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

    return <FlatList data={activities} renderItem={renderActivityItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={[styles.listContent]} style={{ paddingBottom: insets.bottom }} showsVerticalScrollIndicator={false} />;
});

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
