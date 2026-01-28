import { BaseText, ErrorState } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { formatDate } from "@/utils/helper/dateUtils";
import { useGetPatientContracts } from "@/utils/hook";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from "react-native";

export const ConsentTabContent = React.memo(({ patientId }: { patientId: string }) => {
    const { data: contractsData, isLoading, error, isError, refetch } = useGetPatientContracts(patientId, !!patientId);
    const contracts = contractsData?.data || [];

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    if (isError) {
        return (
            <ErrorState 
                message={(error as any)?.message || "Failed to load contracts"} 
                onRetry={refetch} 
                title="Failed to load contracts"
            />
        );
    }

    if (contracts.length === 0) {
        return (
            <View className="flex-1 items-center justify-center gap-3">
                <IconSymbol name="checklist" color={colors.labels.tertiary} size={48} />
                <BaseText type="Body" color="labels.secondary" className="text-center">
                    No contracts signed yet
                </BaseText>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
                <View className="flex-row flex-wrap" style={{ marginHorizontal: -10 }}>
                    {contracts.map((contract) => {
                        const contractDate = contract.signed_at || contract.created_at;
                        const imageUrl = contract.contract_file?.url || contract.contract_template?.preview_image || contract.contract_template?.image;

                        return (
                            <TouchableOpacity
                                key={contract.id}
                                style={{ width: "47%", marginHorizontal: "1.5%", marginBottom: 20 }}
                                onPress={() => {
                                    router.push({
                                        pathname: "/patients/contract/[contractId]",
                                        params: {
                                            contractId: String(contract.id),
                                            patientId: patientId,
                                        },
                                    });
                                }}
                            >
                                <View className="gap-2.5">
                                    <View className="gap-0">
                                        <BaseText type="Subhead" weight={600} color="labels.primary">
                                            {contract.contract_template?.title || "Untitled Contract"}
                                        </BaseText>
                                        <BaseText type="Caption2" color="labels.secondary">
                                            {contractDate ? formatDate(contractDate, "MMM D, YYYY") : ""}
                                        </BaseText>
                                    </View>
                                    <View className="aspect-[816/1056] border border-system-gray6 rounded-md overflow-hidden">
                                        {imageUrl ? (
                                            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
                                        ) : (
                                            <View className="flex-1 items-center justify-center">
                                                <IconSymbol name="doc.text" color={colors.labels.tertiary} size={32} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
});
