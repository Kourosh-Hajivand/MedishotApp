import { BaseText } from "@/components";
import { useGetPatientsCount } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Host, Picker } from "@expo/ui/swift-ui";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import { View } from "react-native";

export function PatientsChartSection() {
    const { selectedPractice } = useProfileStore();
    const [patientsChartPeriod, setPatientsChartPeriod] = useState(0);
    const patientsChartOptions = ["D", "W", "M", "Y", "Total"];
    const patientsChartPeriodValue = patientsChartOptions[patientsChartPeriod] as "D" | "W" | "M" | "Y" | "Total";
    const { data: patientsCountData } = useGetPatientsCount(selectedPractice?.id ?? 0, patientsChartPeriodValue.toLowerCase(), !!selectedPractice?.id);

    // Calculate chart data
    const chartData = useMemo(() => {
        if (!patientsCountData?.data) return [];
        return patientsCountData.data;
    }, [patientsCountData]);

    // Get max value for chart scaling
    const maxChartValue = useMemo(() => {
        if (chartData.length === 0) return 4;
        return Math.max(...chartData.map((d) => d.count), 4);
    }, [chartData]);

    return (
        <View className="bg-white px-4 py-3 gap-3">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Patient's
            </BaseText>
            <Host matchContents style={{ width: "100%" }}>
                <Picker
                    label="Patients Chart Period"
                    options={patientsChartOptions}
                    selectedIndex={patientsChartPeriod}
                    onOptionSelected={({ nativeEvent: { index } }) => {
                        setPatientsChartPeriod(index);
                    }}
                    variant="segmented"
                />
            </Host>
            <View className="flex-row items-end gap-1">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    {chartData.reduce((sum, d) => sum + d.count, 0) || 0}
                </BaseText>
                <BaseText type="Callout" weight="400" color="labels.secondary">
                    Patients
                </BaseText>
            </View>
            <View className="border border-system-gray6 rounded-md h-[234px] relative overflow-hidden bg-white">
                {/* Grid lines */}
                <View className="absolute inset-0 flex-col justify-between py-[38px]">
                    {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={{ width: "100%", height: 0.33, backgroundColor: "#f2f2f7" }} />
                    ))}
                </View>
                {/* Y-axis labels */}
                <View className="absolute left-0 top-0 bottom-0 flex-col justify-between py-[38px] px-2 z-10">
                    {Array.from({ length: 6 }, (_, i) => maxChartValue - i).map((val) => (
                        <View key={val} className="h-[15px] items-center justify-center">
                            <BaseText type="Caption1" weight="400" color="labels.secondary">
                                {val}
                            </BaseText>
                        </View>
                    ))}
                </View>
                {/* X-axis labels and bars */}
                <View className="flex-row items-end justify-between h-full pl-8 pr-2 pb-8">
                    {chartData.length > 0 ? (
                        chartData.slice(0, 6).map((item, index) => {
                            const height = Math.max((item.count / maxChartValue) * 180, 4);
                            return (
                                <View key={index} className="flex-1 items-center justify-end h-full px-1">
                                    <View className="w-full items-center justify-end" style={{ height: "100%", paddingBottom: 32 }}>
                                        <View className="bg-system-blue rounded-t-md" style={{ width: "70%", height, minHeight: 4 }} />
                                    </View>
                                    <BaseText type="Caption1" weight="400" color="labels.secondary" className="mt-1">
                                        {dayjs(item.date).format("HH")}
                                    </BaseText>
                                </View>
                            );
                        })
                    ) : (
                        <View className="flex-1 items-center justify-center h-full">
                            <BaseText type="Body" weight="400" color="labels.secondary">
                                No data
                            </BaseText>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}
