import { BaseText } from "@/components";
import { useGetPatients } from "@/utils/hook/usePatient";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { Host, Picker } from "@expo/ui/swift-ui";
import React, { useMemo, useState } from "react";
import { Image, ScrollView, View } from "react-native";

export function ConsentSection() {
    const { selectedPractice } = useProfileStore();
    const { data: patientsData } = useGetPatients(selectedPractice?.id, { per_page: 10 });
    const [consentPeriod, setConsentPeriod] = useState(0);
    const consentOptions = ["Recently", "Total"];

    // Get all consents from all patients (for practice overview)
    const allConsents = useMemo(() => {
        if (!patientsData?.data) return [];
        // This would need to fetch contracts for each patient, but for now we'll use a placeholder
        // In a real implementation, you'd need an API endpoint for practice-level consents
        return [];
    }, [patientsData?.data]);

    return (
        <View className="bg-white px-4 py-3 gap-3">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Consent
            </BaseText>
            <Host matchContents style={{ width: "100%" }}>
                <Picker
                    label="Consent Period"
                    options={consentOptions}
                    selectedIndex={consentPeriod}
                    onOptionSelected={({ nativeEvent: { index } }) => {
                        setConsentPeriod(index);
                    }}
                    variant="segmented"
                />
            </Host>
            <View className="flex-row items-end gap-1">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    {allConsents.length}
                </BaseText>
                <BaseText type="Callout" weight="400" color="labels.secondary">
                    Consents signed
                </BaseText>
            </View>
            {allConsents.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                    {allConsents.slice(0, 3).map((consent: any, index: number) => (
                        <View key={index} className="gap-[10px]" style={{ width: 174 }}>
                            <View>
                                <BaseText type="Subhead" weight="600" color="labels.primary">
                                    {consent.patientName || "Patient"}
                                </BaseText>
                                <BaseText type="Caption1" weight="400" color="labels.secondary">
                                    {consent.type || "Consent"} - {getRelativeTime(consent.date || "")}
                                </BaseText>
                            </View>
                            <View className="border border-system-gray6 rounded-md bg-system-gray5" style={{ height: 246 }}>
                                {consent.imageUrl && <Image source={{ uri: consent.imageUrl }} className="w-full h-full rounded-md" resizeMode="cover" />}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View className="items-center justify-center py-8">
                    <BaseText type="Body" weight="400" color="labels.secondary">
                        No consents yet
                    </BaseText>
                </View>
            )}
        </View>
    );
}
