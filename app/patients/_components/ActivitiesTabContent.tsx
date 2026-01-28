import { ActivityItem, BaseText, ErrorState } from "@/components";
import { ActivitySkeleton } from "@/components/skeleton/ActivitySkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";
import React, { useCallback, useMemo } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ActivitiesTabContentProps {
    activities: ActivityLog[];
    isLoading: boolean;
    error?: Error | null;
    isError?: boolean;
    onRetry?: () => void;
}

type ActivitySection = {
    date: string;
    data: ActivityLog[];
};

export const ActivitiesTabContent: React.FC<ActivitiesTabContentProps> = React.memo(({ activities, isLoading, error, isError, onRetry }) => {
    const insets = useSafeAreaInsets();

    // Group activities by date
    const groupedActivities = useMemo<ActivitySection[]>(() => {
        if (!activities || activities.length === 0) return [];

        // Group by date
        const grouped: Record<string, ActivityLog[]> = {};
        activities.forEach((activity) => {
            const dateKey = dayjs(activity.created_at || activity.updated_at).format("YYYY-MM-DD");
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(activity);
        });

        // Convert to array of sections and sort by date (newest first)
        return Object.keys(grouped)
            .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())
            .map((dateKey) => ({
                date: dateKey,
                data: grouped[dateKey].sort((a, b) => {
                    const dateA = dayjs(a.created_at || a.updated_at).valueOf();
                    const dateB = dayjs(b.created_at || b.updated_at).valueOf();
                    return dateB - dateA; // Newest first
                }),
            }));
    }, [activities]);

    const renderSectionHeader = useCallback(({ section }: { section: ActivitySection }) => {
        const dateLabel = dayjs(section.date).format("MMMM D, YYYY");
        const isToday = dayjs(section.date).isSame(dayjs(), "day");
        const isYesterday = dayjs(section.date).isSame(dayjs().subtract(1, "day"), "day");
        let displayDate = dateLabel;
        if (isToday) displayDate = "Today";
        else if (isYesterday) displayDate = "Yesterday";
        else if (dayjs(section.date).isSame(dayjs(), "year")) {
            displayDate = dayjs(section.date).format("MMMM D");
        }

        return (
            <LinearGradient colors={["rgba(255, 255, 255, 0.08)", "rgba(120, 120, 128, 0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ paddingHorizontal: 16, paddingVertical: 4, zIndex: 0 }} className="w-full">
                <BaseText type="Footnote" weight="600" color="labels.tertiary">
                    {displayDate}
                </BaseText>
            </LinearGradient>
        );
    }, []);

    const renderActivityItem = useCallback(({ item, index, section }: { item: ActivityLog; index: number; section: ActivitySection }) => {
        const isLastActivityOfDay = index === section.data.length - 1;
        return <ActivityItem activity={item} showBorder={!isLastActivityOfDay} showDateHeader={false} />;
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

    return (
        <SectionList
            sections={groupedActivities}
            renderItem={renderActivityItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[styles.listContent]}
            style={{ paddingBottom: insets.bottom }}
            showsVerticalScrollIndicator={false}
        />
    );
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
