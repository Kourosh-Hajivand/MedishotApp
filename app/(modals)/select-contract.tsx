import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useGetContractTemplates } from "@/utils/hook";
import { useHeaderHeight } from "@react-navigation/elements";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, Dimensions, FlatList, Image, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = (width - 48) / 2; // 2 columns with padding
const ITEM_GAP = 16;

export default function SelectContractScreen() {
    const { patientId } = useLocalSearchParams<{ patientId: string }>();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const { data: contractsData, isLoading } = useGetContractTemplates(patientId ? Number(patientId) : undefined);

    const handleSelectContract = (templateId: number) => {
        // Dismiss the modal first
        router.dismiss();

        // Then navigate to the sign contract page
        setTimeout(() => {
            router.push({
                pathname: "/patients/sign-contract",
                params: {
                    patientId: patientId || "",
                    templateId: String(templateId),
                },
            });
        }, 100);
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ paddingTop: headerHeight }}>
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    const contracts = contractsData?.data || [];

    if (contracts.length === 0) {
        return (
            <View className="flex-1 items-center justify-center" style={{ paddingTop: headerHeight, paddingBottom: insets.bottom + 20 }}>
                <IconSymbol name="doc.text" color={colors.labels.tertiary} size={64} />
                <BaseText type="Body" color="labels.secondary" className="mt-4 text-center px-6">
                    No contract templates available
                </BaseText>
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.system.gray6 }}>
            <FlatList
                data={contracts}
                numColumns={2}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: headerHeight, paddingHorizontal: 8 }}
                columnWrapperStyle={{ gap: ITEM_GAP }}
                ItemSeparatorComponent={() => <View style={{ height: ITEM_GAP }} />}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleSelectContract(item.id)} className="rounded-lg overflow-hidden" style={{ width: ITEM_WIDTH }}>
                        <View className="p-3 gap-2">
                            <BaseText type="Subhead" weight={600} color="labels.primary" numberOfLines={2}>
                                {item.title}
                            </BaseText>
                            <View
                                className="rounded overflow-hidden bg-white"
                                style={{
                                    aspectRatio: 816 / 1056, // US Letter aspect ratio
                                    width: "100%",
                                }}
                            >
                                {item.preview_image ? (
                                    <Image source={{ uri: item.preview_image }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="flex-1 items-center justify-center">
                                        <IconSymbol name="doc.text" color={colors.labels.tertiary} size={40} />
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}
