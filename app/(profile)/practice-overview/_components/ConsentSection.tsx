import { BaseText } from "@/components";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import { useGetPatients } from "@/utils/hook/usePatient";
import { useGetLatestContracts } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";

export function ConsentSection() {
    const { selectedPractice } = useProfileStore();
    const { data: contractsData, isLoading } = useGetLatestContracts(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const { data: patientsData } = useGetPatients(selectedPractice?.id, { per_page: 100 });

    // Map contracts with patient names
    const allConsents = useMemo(() => {
        if (!contractsData?.data || !patientsData?.data) return [];

        return contractsData.data.map((contract) => {
            const patient = patientsData.data.find((p) => p.id === contract.patient_id);
            return {
                ...contract,
                patientName: patient?.full_name || `${patient?.first_name || ""} ${patient?.last_name || ""}`.trim() || "Patient",
                imageUrl: contract.contract_file?.url || null,
                date: contract.signed_at || contract.created_at,
                type: contract.contract_template?.title || "Consent",
            };
        });
    }, [contractsData?.data, patientsData?.data]);

    return (
        <View className="bg-white px-4 py-3 gap-3">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Recently Consent
            </BaseText>
            <View className="flex-row items-end gap-1">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    {allConsents.length}
                </BaseText>
                <BaseText type="Callout" weight="400" color="labels.secondary">
                    Consents signed
                </BaseText>
            </View>
            {isLoading ? (
                <View className="items-center justify-center py-8">
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : allConsents.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                    {allConsents.slice(0, 3).map((consent) => (
                        <View key={consent.id} className="gap-[10px]" style={{ width: 174 }}>
                            <View>
                                <BaseText type="Subhead" weight="600" color="labels.primary" numberOfLines={1} lineBreakMode="tail">
                                    {consent.patientName}
                                </BaseText>
                                <BaseText type="Caption1" weight="400" color="labels.secondary" numberOfLines={2} lineBreakMode="tail">
                                    {consent.type} - {getRelativeTime(consent.date || "")}
                                </BaseText>
                            </View>
                            <View className="border border-system-gray6 rounded-md bg-background aspect-[816/1056]  w-full">
                                {consent.imageUrl ? (
                                    <Image source={{ uri: consent.imageUrl }} className="w-full h-full rounded-md" resizeMode="contain" />
                                ) : (
                                    <View className="w-full h-full items-center justify-center">
                                        <BaseText type="Body" weight="400" color="labels.tertiary">
                                            No preview
                                        </BaseText>
                                    </View>
                                )}
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
