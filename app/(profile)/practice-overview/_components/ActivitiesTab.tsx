import { ActivityItem, BaseText } from "@/components";
import { ActivitySkeleton } from "@/components/skeleton/ActivitySkeleton";
import { colors } from "@/theme/colors";
import { useGetPracticeActivities } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import dayjs from "dayjs";
import React, { useMemo } from "react";
import { View } from "react-native";

interface ActivitiesTabProps {
    practiceId?: number;
}

type ActivityItemType = {
    activity: ActivityLog;
    date: string;
};

export function ActivitiesTab({ practiceId }: ActivitiesTabProps) {
    const { selectedPractice } = useProfileStore();
    const finalPracticeId = practiceId ?? selectedPractice?.id ?? 0;
    const { data: practiceActivities, isLoading, error } = useGetPracticeActivities(finalPracticeId, !!finalPracticeId);

    // Group activities by date for Activities tab
    const groupedActivities = useMemo<Record<string, ActivityItemType[]>>(() => {
        if (!practiceActivities?.data) return {};
        const allActivities: ActivityItemType[] = practiceActivities.data.map((activity) => ({
            activity,
            date: dayjs(activity.created_at).format("YYYY-MM-DD"),
        }));
        // Sort by date (newest first)
        allActivities.sort((a, b) => dayjs(b.activity.created_at).valueOf() - dayjs(a.activity.created_at).valueOf());
        // Group by date
        const grouped: Record<string, ActivityItemType[]> = {};
        allActivities.forEach((item) => {
            if (!grouped[item.date]) {
                grouped[item.date] = [];
            }
            grouped[item.date].push(item);
        });
        return grouped;
    }, [practiceActivities?.data]);

    if (isLoading) {
        return (
            <View className="pb-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <ActivitySkeleton key={`skeleton-${index}`} showDate={index === 0 || index === 2} showBorder={index < 4} />
                ))}
            </View>
        );
    }

    if (error) {
        return (
            <View className="items-center justify-center py-12 px-4">
                <BaseText type="Body" weight="400" color="labels.secondary">
                    Failed to load activities
                </BaseText>
            </View>
        );
    }

    if (Object.keys(groupedActivities).length === 0) {
        return (
            <View className="items-center justify-center py-12 px-4">
                <BaseText type="Body" weight="400" color="labels.secondary">
                    No activities yet
                </BaseText>
            </View>
        );
    }

    return (
        <View className="pb-4">
            {Object.keys(groupedActivities)
                .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())
                .map((dateKey) => {
                    const activities = groupedActivities[dateKey];
                    const dateLabel = dayjs(dateKey).format("MMMM D, YYYY");
                    const isToday = dayjs(dateKey).isSame(dayjs(), "day");
                    const isYesterday = dayjs(dateKey).isSame(dayjs().subtract(1, "day"), "day");
                    let displayDate = dateLabel;
                    if (isToday) displayDate = "Today";
                    else if (isYesterday) displayDate = "Yesterday";
                    else if (dayjs(dateKey).isSame(dayjs(), "year")) {
                        displayDate = dayjs(dateKey).format("MMMM D");
                    }

                    return (
                        <View key={dateKey}>
                       
                            {activities.map((item: ActivityItemType, idx: number) => {
                                // Check if this is the last activity of the day to hide border
                                const isLastActivityOfDay = idx === activities.length - 1;
                                
                                return (
                                    <ActivityItem 
                                        key={`activity-${dateKey}-${idx}`} 
                                        activity={item.activity}
                                        showBorder={!isLastActivityOfDay}
                                    />
                                );
                            })}
                        </View>
                    );
                })}
        </View>
    );
}
