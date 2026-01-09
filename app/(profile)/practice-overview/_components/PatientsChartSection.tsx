import { BaseText } from "@/components";
import { useGetPatientsCount } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Host, Picker } from "@expo/ui/swift-ui";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type ChartPeriod = "D" | "W" | "M" | "Y" | "Total";
type ApiPeriod = "daily-of-week" | "weekly-of-month" | "monthly-of-year" | "yearly" | "total";

const getApiPeriod = (period: ChartPeriod): ApiPeriod => {
    const mapping: Partial<Record<ChartPeriod, ApiPeriod>> = {
        D: "daily-of-week",
        W: "weekly-of-month",
        M: "monthly-of-year",
        Y: "yearly",
        // Total: "total",
    };
    return mapping[period] ?? "total"; // Fallback to "total" if not found
};

const formatDateLabel = (date: string, period: ChartPeriod): string => {
    switch (period) {
        case "D":
            // Daily: date format is "2026-01-05" -> show day name (Mon, Tue, etc.)
            return dayjs(date).format("ddd");
        case "W":
            // Weekly: date format is "2026-W01" -> show as is (W01, W02, etc.)
            // Extract week number from "2026-W01" format
            const weekMatch = date.match(/W(\d+)/);
            if (weekMatch) {
                return `W${weekMatch[1]}`;
            }
            return date;
        case "M":
            // Monthly: date format is "2026-01" -> show month name (Jan, Feb, etc.)
            return dayjs(date + "-01").format("MMM");
        case "Y":
            // Yearly: date format is "2026" -> show year
            return date;
        case "Total":
            // Total: date format is "2026" -> show year
            return date;
        default:
            return date;
    }
};

export function PatientsChartSection() {
    const { selectedPractice } = useProfileStore();
    const [patientsChartPeriod, setPatientsChartPeriod] = useState(0);
    // const patientsChartOptions: ChartPeriod[] = ["D", "W", "M", "Y", "Total"];
    const patientsChartOptions: ChartPeriod[] = ["D", "W", "M", "Y"];
    const selectedPeriod = patientsChartOptions[patientsChartPeriod];
    const apiPeriod = getApiPeriod(selectedPeriod);
    const { data: patientsCountData, isLoading } = useGetPatientsCount(selectedPractice?.id ?? 0, apiPeriod, !!selectedPractice?.id);

    // Calculate chart data
    const chartData = useMemo(() => {
        if (!patientsCountData?.data) return [];
        return patientsCountData.data;
    }, [patientsCountData]);

    // Get max value for chart scaling - directly from backend data
    const maxChartValue = useMemo(() => {
        if (chartData.length === 0) return 4; // Default when no data
        const maxCount = Math.max(...chartData.map((d) => d.count));
        // If all counts are 0, show at least 4 for visibility, otherwise use actual max
        return maxCount === 0 ? 4 : maxCount;
    }, [chartData]);

    return (
        <View className="bg-white px-4 py-3 gap-3 pt-6">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Patient's
            </BaseText>
            <Host style={{ width: "100%", height: 35 }}>
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
                {/* Grid lines - dynamic based on maxChartValue, aligned with Y-axis labels */}
                <View className="absolute inset-0 flex-col justify-between py-[45px]">
                    {useMemo(() => {
                        // Calculate number of Y-axis labels
                        const numLabels = maxChartValue <= 10 ? maxChartValue + 1 : 6;
                        // Grid lines should be between labels (numLabels - 1 lines)
                        // But we need to exclude the bottom line (at 0), so we show lines above each label except the bottom one
                        return Array.from({ length: numLabels - 1 }, (_, i) => i);
                    }, [maxChartValue]).map((i) => (
                        <View key={i} style={{ width: "100%", height: 0.33, backgroundColor: "#f2f2f7" }} />
                    ))}
                </View>
                {/* Y-axis labels - starts from 0 */}
                <View className="absolute left-0 top-0 bottom-0 flex-col justify-between py-[38px] px-2 z-10">
                    {useMemo(() => {
                        // If maxChartValue is small (<= 10), show all numbers from 0 to maxChartValue
                        if (maxChartValue <= 10) {
                            return Array.from({ length: maxChartValue + 1 }, (_, i) => maxChartValue - i);
                        }
                        // For larger values, use step-based approach with max 6 labels
                        const step = maxChartValue / 5;
                        return Array.from({ length: 6 }, (_, i) => Math.round(maxChartValue - i * step));
                    }, [maxChartValue]).map((val) => (
                        <View key={val} className="h-[15px] items-center justify-center">
                            <BaseText type="Caption1" weight="400" color="labels.secondary">
                                {val}
                            </BaseText>
                        </View>
                    ))}
                </View>
                {/* X-axis labels and bars */}
                <View className="flex-row items-end justify-between h-full pl-8 pr-2 pb-4">
                    {isLoading ? (
                        <View className="flex-1 items-center justify-center h-full">
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : chartData.length > 0 ? (
                        chartData.slice(0, 6).map((item, index) => {
                            // Calculate available height: 234px total - 38px top padding - 38px bottom padding - 32px for X-axis labels = 126px
                            const availableHeight = 126;
                            // Calculate bar height: if count = maxChartValue, bar should reach top (availableHeight)
                            // if count = 0, show minHeight 4, otherwise proportional
                            const barHeight = item.count === 0 ? 4 : (item.count / maxChartValue) * availableHeight;
                            // Ensure bar doesn't exceed available height and has minimum 4px for visibility
                            const clampedHeight = Math.max(Math.min(barHeight, availableHeight), item.count === 0 ? 4 : 0);
                            return (
                                <View key={index} className="flex-1 items-center px-1" style={{ height: "100%", justifyContent: "flex-end", paddingBottom: 16 }}>
                                    {/* Container for bar - exactly matches availableHeight (0 to maxChartValue) */}
                                    <View className="w-[70%] items-center relative" style={{ height: availableHeight }}>
                                        {/* Bar - starts from absolute bottom (0 line), ends at proportional height */}
                                        <View
                                            className="bg-system-blue rounded-t-md w-full absolute bottom-0"
                                            style={{
                                                height: clampedHeight,
                                            }}
                                        />
                                    </View>
                                    {/* Label - below the chart area */}
                                    <View className="w-[100%] items-center h-fit mt-2">
                                        <BaseText type="Caption1" weight="400" color="labels.secondary">
                                            {formatDateLabel(item.date, selectedPeriod)}
                                        </BaseText>
                                    </View>
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
