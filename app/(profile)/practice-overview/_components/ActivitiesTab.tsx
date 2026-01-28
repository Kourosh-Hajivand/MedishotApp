import { ActivitiesList } from "@/components";
import { useGetPracticeActivities } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import React from "react";
import { View } from "react-native";

interface ActivitiesTabProps {
    practiceId?: number;
}

export function ActivitiesTab({ practiceId }: ActivitiesTabProps) {
    const { selectedPractice } = useProfileStore();
    const finalPracticeId = practiceId ?? selectedPractice?.id ?? 0;
    const { data: practiceActivities, isLoading, error, isError, refetch } = useGetPracticeActivities(finalPracticeId, !!finalPracticeId);

    return (
        <View className="pb-4">
            <ActivitiesList
                activities={practiceActivities?.data ?? []}
                isLoading={isLoading}
                error={error}
                isError={isError}
                onRetry={refetch}
                emptyTitle="No activities yet"
                emptyDescription=""
                variant="flat"
            />
        </View>
    );
}
