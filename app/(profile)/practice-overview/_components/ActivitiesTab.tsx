import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { colors } from "@/theme/colors";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useGetPracticeMembers } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Member } from "@/utils/service/models/ResponseModels";
import dayjs from "dayjs";
import React, { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";

interface ActivitiesTabProps {
    practiceId?: number;
}

type ActivityItem = {
    activity: NonNullable<Member["activities"]>[number];
    member: Member;
    date: string;
};

export function ActivitiesTab({ practiceId }: ActivitiesTabProps) {
    const { selectedPractice } = useProfileStore();
    const { data: practiceMembers } = useGetPracticeMembers(practiceId ?? selectedPractice?.id ?? 0, !!practiceId || !!selectedPractice?.id);

    // Group activities by date for Activities tab
    const groupedActivities = useMemo<Record<string, ActivityItem[]>>(() => {
        if (!practiceMembers?.data) return {};
        const allActivities: ActivityItem[] = [];
        practiceMembers.data.forEach((member) => {
            if (member.activities) {
                member.activities.forEach((activity) => {
                    allActivities.push({
                        activity,
                        member,
                        date: dayjs(activity.created_at).format("YYYY-MM-DD"),
                    });
                });
            }
        });
        // Sort by date (newest first)
        allActivities.sort((a, b) => dayjs(b.activity.created_at).valueOf() - dayjs(a.activity.created_at).valueOf());
        // Group by date
        const grouped: Record<string, ActivityItem[]> = {};
        allActivities.forEach((item) => {
            if (!grouped[item.date]) {
                grouped[item.date] = [];
            }
            grouped[item.date].push(item);
        });
        return grouped;
    }, [practiceMembers?.data]);

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
                            <View className="h-[26px] px-4 py-1 bg-system-gray6">
                                <BaseText type="Footnote" weight="600" color="labels.tertiary">
                                    {displayDate}
                                </BaseText>
                            </View>
                            {activities.map((item: ActivityItem, idx: number) => {
                                const activity = item.activity;
                                const member = item.member;
                                const memberName = member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email;
                                const isImageActivity = activity.description?.toLowerCase().includes("image") || activity.description?.toLowerCase().includes("picture");
                                const isNoteActivity = activity.description?.toLowerCase().includes("note");
                                const isAppointmentActivity = activity.description?.toLowerCase().includes("appointment") || activity.description?.toLowerCase().includes("scheduled");

                                return (
                                    <View key={`activity-${dateKey}-${idx}`} className="border-b border-system-gray5">
                                        {isImageActivity ? (
                                            <TouchableOpacity className="flex-row items-center justify-between px-4 py-3">
                                                <View className="flex-row items-center gap-3 flex-1">
                                                    <View className="w-[38px] h-[38px] rounded-lg bg-white overflow-hidden">
                                                        {/* Placeholder for image thumbnails */}
                                                        <View className="w-full h-full bg-system-gray5" />
                                                    </View>
                                                    <View className="flex-1">
                                                        <BaseText type="Callout" weight="400" color="labels.primary">
                                                            {activity.description}
                                                        </BaseText>
                                                        <BaseText type="Caption2" weight="400" color="labels.secondary">
                                                            by {member.role} {memberName}
                                                        </BaseText>
                                                    </View>
                                                </View>
                                                <IconSymbol name="chevron.right" size={17} color={colors.labels.tertiary} />
                                            </TouchableOpacity>
                                        ) : isNoteActivity ? (
                                            <View className="flex-row items-start gap-3 px-4 py-4">
                                                <View className="w-[38px] h-[38px] rounded-lg bg-yellow/10 items-center justify-center">
                                                    <IconSymbol name="note.text" size={20} color="#fc0" />
                                                </View>
                                                <View className="flex-1">
                                                    <BaseText type="Callout" weight="400" color="labels.secondary">
                                                        note by {member.role} {memberName}:
                                                    </BaseText>
                                                    <BaseText type="Callout" weight="400" color="labels.primary" className="mt-1">
                                                        {activity.properties?.note || activity.description}
                                                    </BaseText>
                                                </View>
                                            </View>
                                        ) : isAppointmentActivity ? (
                                            <View className="flex-row items-center gap-3 px-4 py-3">
                                                <View className="w-[38px] h-[38px] rounded-lg bg-red/20 items-center justify-center">
                                                    <IconSymbol name="calendar" size={20} color={colors.system.red} />
                                                </View>
                                                <View className="flex-1">
                                                    <BaseText type="Callout" weight="400" color="labels.primary">
                                                        {activity.description}
                                                    </BaseText>
                                                    <BaseText type="Caption2" weight="400" color="labels.secondary">
                                                        by {member.role} {memberName}
                                                    </BaseText>
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center gap-3 px-4 py-3">
                                                <View className="w-[38px] h-[38px] rounded-lg bg-system-gray6 items-center justify-center">
                                                    <IconSymbol name="circle.fill" size={20} color={colors.system.gray} />
                                                </View>
                                                <View className="flex-1">
                                                    <BaseText type="Callout" weight="400" color="labels.primary">
                                                        {activity.description}
                                                    </BaseText>
                                                    <BaseText type="Caption2" weight="400" color="labels.secondary">
                                                        by {member.role} {memberName}
                                                    </BaseText>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
        </View>
    );
}
