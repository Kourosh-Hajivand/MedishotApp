import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { colors } from "@/theme/colors";
import { useGetPatients } from "@/utils/hook/usePatient";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Patient } from "@/utils/service/models/ResponseModels";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";

export function PatientsListSection() {
    const { selectedPractice } = useProfileStore();
    const { data: patientsData } = useGetPatients(selectedPractice?.id);

    // Get recent patients list
    const recentPatients = useMemo(() => {
        if (!patientsData?.data) return [];
        return patientsData.data.slice(0, 4);
    }, [patientsData?.data]);

    return (
        <View className="bg-white px-4 py-3 gap-3">
            <TouchableOpacity onPress={() => router.push(`/(tabs)/patients`)} className="flex-row items-center justify-between">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    Patients
                </BaseText>
                <IconSymbol name="chevron.right" size={16} color={colors.labels.tertiary} />
            </TouchableOpacity>
            <View className="flex-row items-end gap-1">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    {patientsData?.data?.length ?? 0}
                </BaseText>
                <BaseText type="Callout" weight="400" color="labels.secondary">
                    patients in total
                </BaseText>
            </View>
            <View className="gap-0">
                {recentPatients.map((patient: Patient, index: number) => (
                    <View key={patient.id}>
                        <TouchableOpacity className="flex-row items-center justify-between py-2" onPress={() => router.push(`/patients/${patient.id}`)}>
                            <View className="flex-row items-center gap-3">
                                <Avatar size={32} rounded={99} name={patient.full_name} imageUrl={patient.profile_image?.url} color={patient.doctor?.color} haveRing />
                                <BaseText type="Callout" weight="600" color="labels.primary">
                                    {patient.full_name}
                                </BaseText>
                            </View>
                            <IconSymbol name="chevron.right" size={16} color={colors.labels.tertiary} />
                        </TouchableOpacity>
                        {index < recentPatients.length - 1 && <View className="h-[0.33px] bg-system-gray5" />}
                    </View>
                ))}
            </View>
        </View>
    );
}
