import { BaseButton, BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { colors } from "@/theme/colors";
import { formatDate, getRelativeTime } from "@/utils/helper/dateUtils";
import { useGetPracticeMembers } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Member } from "@/utils/service/models/ResponseModels";
import { router } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TeamTabProps {
    practiceId?: number;
}

export function TeamTab({ practiceId }: TeamTabProps) {
    const { selectedPractice } = useProfileStore();
    const { data: practiceMembers } = useGetPracticeMembers(practiceId ?? selectedPractice?.id ?? 0, !!practiceId || !!selectedPractice?.id);

    // Calculate enhanced pictures count from activities
    const getEnhancedPicturesCount = (member: Member): number => {
        if (!member.activities) return 0;
        return member.activities.filter((activity) => activity.description?.toLowerCase().includes("enhanced") || activity.description?.toLowerCase().includes("enhancement")).length;
    };

    // Get last activity description
    const getLastActivity = (member: Member): string => {
        if (!member.activities || member.activities.length === 0) {
            // If no activities, use member's updated_at
            if (member.updated_at) {
                return `${getRelativeTime(member.updated_at)}`;
            }
            return "No activity";
        }
        const lastActivity = member.activities[0];
        const timeAgo = getRelativeTime(lastActivity.updated_at || lastActivity.created_at);
        return `${timeAgo}`;
    };

    const { bottom } = useSafeAreaInsets();
    return (
        <View style={{ paddingBottom: bottom }} className="gap-3 px-4 py-3 bg-[#F2F2F7]">
            {practiceMembers?.data?.map((member) => {
                const enhancedCount = getEnhancedPicturesCount(member);
                const lastActivity = getLastActivity(member);
                const isOwner = member.role === "owner";
                const memberName = member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email;

                return (
                    <View key={`member-${member.id}`} className="bg-white rounded-lg overflow-hidden">
                        <View className="p-3 gap-[10px]">
                            <TouchableOpacity
                                onPress={() =>
                                    router.push({
                                        pathname: "/(profile)/practice-member-details",
                                        params: {
                                            practiceId: String(practiceId ?? selectedPractice?.id ?? 0),
                                            memberId: String(member.id),
                                        },
                                    })
                                }
                                className="flex-row items-center justify-between pl-0 pr-3"
                            >
                                <View className="flex-row items-center gap-[10px]">
                                    <Avatar size={52} rounded={99} name={memberName} imageUrl={member.image?.url} color={member.color} />

                                    <View>
                                        <BaseText type="Callout" weight="600" color="labels.primary">
                                            {memberName}
                                        </BaseText>
                                        <BaseText type="Footnote" weight="400" color="labels.secondary" className="capitalize">
                                            {member.role}
                                        </BaseText>
                                    </View>
                                </View>
                                <IconSymbol name="chevron.right" size={16} color={colors.labels.tertiary} />
                            </TouchableOpacity>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-col items-start">
                                    <BaseText type="Footnote" weight="400" color="labels.secondary">
                                        added patient
                                    </BaseText>
                                    <BaseText type="Callout" weight="600" color="labels.primary">
                                        {member.patients_count ?? 0}
                                    </BaseText>
                                </View>
                                <View style={{ width: 0.33, height: 39, backgroundColor: "#c6c6c8" }} />
                                <View className="flex-col items-start">
                                    <BaseText type="Footnote" weight="400" color="labels.secondary">
                                        taken picture
                                    </BaseText>
                                    <BaseText type="Callout" weight="600" color="labels.primary">
                                        {member.taken_images_count ?? 0}
                                    </BaseText>
                                </View>
                                <View style={{ width: 0.33, height: 39, backgroundColor: "#c6c6c8" }} />
                                <View className="flex-col items-start">
                                    <BaseText type="Footnote" weight="400" color="labels.secondary">
                                        enhanced picture
                                    </BaseText>
                                    <BaseText type="Callout" weight="600" color="labels.primary">
                                        {enhancedCount}
                                    </BaseText>
                                </View>
                            </View>
                            <View style={{ width: "100%", height: 0.33, backgroundColor: "#c6c6c8" }} />
                            <View className="flex-row items-center justify-between">
                                <BaseText type="Footnote" weight="400" color="labels.secondary">
                                    last activity
                                </BaseText>
                                <BaseText type="Callout" weight="600" color="labels.primary">
                                    {lastActivity}
                                </BaseText>
                            </View>
                            <View style={{ width: "100%", height: 0.33, backgroundColor: "#c6c6c8" }} />
                            <View className="flex-row items-center justify-between">
                                <BaseText type="Footnote" weight="400" color="labels.secondary">
                                    joined date
                                </BaseText>
                                <BaseText type="Callout" weight="600" color="labels.primary">
                                    {member.joined_at ? formatDate(member.joined_at) : ""}
                                </BaseText>
                            </View>
                        </View>
                    </View>
                );
            })}

            <BaseButton
                onPress={() => {
                    router.push({
                        pathname: "/(modals)/add-practice-member",
                        params: { practiceId: selectedPractice?.id },
                    });
                }}
                label="Member"
                ButtonStyle="Tinted"
                leftIcon={<IconSymbol name="plus" size={15} color={colors.system.blue} />}
            />
        </View>
    );
}
