import { BaseText } from "@/components";
import { useGetPracticeMembers, useGetRecentlyPhotos } from "@/utils/hook/usePractice";
import { useGetPatients } from "@/utils/hook/usePatient";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import React, { useMemo } from "react";
import { View } from "react-native";

export function OverviewStatisticsSection() {
    const { selectedPractice } = useProfileStore();
    const { data: recentPhotos } = useGetRecentlyPhotos(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const { data: patientsData } = useGetPatients(selectedPractice?.id, { per_page: 10 });
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, !!selectedPractice?.id);

    // Get all consents from all patients (for practice overview)
    const allConsents = useMemo(() => {
        if (!patientsData?.data) return [];
        // This would need to fetch contracts for each patient, but for now we'll use a placeholder
        // In a real implementation, you'd need an API endpoint for practice-level consents
        return [];
    }, [patientsData?.data]);

    return (
        <View className="bg-white px-4 py-3 gap-4">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Overview
            </BaseText>
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Total Image Taken
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        {recentPhotos?.data?.length ? recentPhotos.data.length * 100 : 0}
                    </BaseText>
                </View>
                <View style={{ width: 0.33, height: 62, backgroundColor: "#c6c6c8" }} />
                <View className="flex-1 pl-4">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Total Consent Signed
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        {allConsents.length}
                    </BaseText>
                </View>
            </View>
            <View style={{ width: "100%", height: 0.33, backgroundColor: "#c6c6c8" }} />
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Total Ai Enhancment
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        0 Images
                    </BaseText>
                </View>
                <View style={{ width: 0.33, height: 62, backgroundColor: "#c6c6c8" }} />
                <View className="flex-1 pl-4">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Team members
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        {practiceMembers?.data?.length ?? 0}
                    </BaseText>
                </View>
            </View>
        </View>
    );
}
