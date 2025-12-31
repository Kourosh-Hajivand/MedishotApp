import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { formatDate } from "@/utils/helper/dateUtils";
import { useGetContract, useGetPatientById } from "@/utils/hook";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { ActivityIndicator, Image, ScrollView, Share, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ContractDetailScreen() {
    const { contractId, patientId } = useLocalSearchParams<{ contractId: string; patientId: string }>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const { data: contractData, isLoading: isLoadingContract } = useGetContract(contractId || "", !!contractId);
    const { data: patientData, isLoading: isLoadingPatient } = useGetPatientById(patientId || "");

    const contract = contractData?.data;
    const patient = patientData?.data;

    const handleShare = async () => {
        if (!contract?.contract_file?.url) {
            return;
        }

        try {
            await Share.share({
                url: contract.contract_file.url,
                message: `Contract: ${contract.contract_template?.title || "Contract"}`,
            });
        } catch (error) {
            console.error("Error sharing contract:", error);
        }
    };

    useLayoutEffect(() => {
        if (!patient) return;

        const patientName = `${patient.first_name} ${patient.last_name}`;
        const patientImageUrl = patient.profile_image?.url;
        const photoDate = patient.profile_image?.created_at ? formatDate(patient.profile_image.created_at, "MMM D, YYYY") : patient.created_at ? formatDate(patient.created_at, "MMM D, YYYY") : "";

        navigation.setOptions({
            headerTitle: "",
            headerTitleAlign: "center",
            headerRight: () => (
                <TouchableOpacity onPress={handleShare} disabled={!contract?.contract_file?.url} className="flex-row  translate-x-1.5 items-center justify-center">
                    <IconSymbol name="square.and.arrow.up" color={contract?.contract_file?.url ? colors.system.blue : colors.labels.tertiary} size={24} />
                </TouchableOpacity>
            ),
        });
    }, [patient, contract, navigation]);

    const isLoading = isLoadingContract || isLoadingPatient;

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    if (!contract) {
        return (
            <View className="flex-1 items-center justify-center">
                <BaseText type="Body" color="labels.secondary">
                    Contract not found
                </BaseText>
            </View>
        );
    }

    const contractImageUrl = contract.contract_file?.url || contract.contract_template?.preview_image || contract.contract_template?.image;

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: headerHeight }}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, alignItems: "center", paddingBottom: insets.bottom + 20 }}>
                {contractImageUrl ? (
                    <Image source={{ uri: contractImageUrl }} style={{ width: "100%", aspectRatio: 816 / 1056 }} resizeMode="contain" />
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <IconSymbol name="doc.text" color={colors.labels.tertiary} size={64} />
                        <BaseText type="Body" color="labels.secondary" className="mt-4">
                            No contract image available
                        </BaseText>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
