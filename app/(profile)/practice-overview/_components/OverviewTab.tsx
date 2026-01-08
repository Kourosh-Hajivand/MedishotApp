import React from "react";
import { View } from "react-native";
import { ConsentSection } from "./ConsentSection";
import { OverviewStatisticsSection } from "./OverviewStatisticsSection";
import { PatientsChartSection } from "./PatientsChartSection";
import { PatientsListSection } from "./PatientsListSection";
import { RecentPhotosSection } from "./RecentPhotosSection";

export function OverviewTab() {
    return (
        <View className="gap-2 bg-[#F2F2F7]">
            <PatientsChartSection />
            <ConsentSection />
            <RecentPhotosSection />
            <PatientsListSection />
            <OverviewStatisticsSection />
        </View>
    );
}
