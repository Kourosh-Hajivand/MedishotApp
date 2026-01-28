import { ActivitiesList } from "@/components";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import React from "react";
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

    return (
        <ActivitiesList
            activities={activities}
            isLoading={isLoading}
            error={error}
            isError={isError}
            onRetry={onRetry}
            emptyTitle="No Activities"
            emptyDescription="This patient doesn't have any activities yet."
            variant="list"
            listPaddingBottom={insets.bottom}
        />
    );
});
