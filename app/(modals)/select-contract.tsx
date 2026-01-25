import { BaseText } from "@/components";
import { ErrorState } from "@/components/ErrorState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { useGetContractTemplates } from "@/utils/hook";
import { ContractTemplate } from "@/utils/service/models/ResponseModels";
import { useHeaderHeight } from "@react-navigation/elements";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, SectionList, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ITEM_GAP = 12;

const CATEGORY_ICON_MAP: Record<string, string> = {
    general: "doc.text",
    Consents: "checklist",
};

function categoryIconToSfSymbol(icon?: string | null): string {
    if (!icon) return "doc.text";
    return CATEGORY_ICON_MAP[icon] ?? "doc.text";
}

type Section = { title: string; data: ContractTemplate[]; isFirst?: boolean; icon?: string | null };

export default function SelectContractScreen() {
    const { patientId } = useLocalSearchParams<{ patientId: string }>();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const { data: contractsData, isLoading, error, refetch } = useGetContractTemplates(patientId ? Number(patientId) : undefined);

    const sections = useMemo(() => {
        const list = contractsData?.data ?? [];
        const map = new Map<number, { name: string; icon?: string | null; contracts: ContractTemplate[] }>();
        for (const c of list) {
            const id = c.category_id ?? c.category?.id ?? 0;
            const name = c.category?.name ?? "Other";
            const icon = c.category?.icon ?? null;
            if (!map.has(id)) map.set(id, { name, icon, contracts: [] });
            map.get(id)!.contracts.push(c);
        }
        return [...map.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([_, { name, icon, contracts }], i) => ({
                title: name,
                data: contracts,
                isFirst: i === 0,
                icon,
            }));
    }, [contractsData?.data]);

    const handleSelectContract = useCallback(
        (templateId: number) => {
            router.dismiss();
            setTimeout(() => {
                router.push({
                    pathname: "/patients/sign-contract",
                    params: {
                        patientId: patientId || "",
                        templateId: String(templateId),
                    },
                });
            }, 100);
        },
        [patientId],
    );

    const renderItem = useCallback(
        ({ item }: { item: ContractTemplate }) => (
            <TouchableOpacity
                onPress={() => handleSelectContract(item.id)}
                className="rounded-xl overflow-hidden bg-white"
                style={{ width: "100%", marginBottom: ITEM_GAP }}
            >
                <View className="px-6 py-4 gap-2 flex-row items-center">
                    {/* <View
                        className="rounded overflow-hidden bg-white"
                        style={{ aspectRatio: 1, width: 56, height: 56 }}
                    >
                        {item.preview_image ? (
                            <Image source={{ uri: item.preview_image }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <IconSymbol name="doc.text" color={colors.labels.tertiary} size={24} />
                            </View>
                        )}
                    </View> */}
                    <BaseText type="Body" weight={400} color="labels.primary" numberOfLines={2} style={{ flex: 1 }}>
                        {item.title}
                    </BaseText>
                </View>
            </TouchableOpacity>
        ),
        [handleSelectContract],
    );

    const renderSectionHeader = useCallback(({ section }: { section: Section }) => {
        const paddingTop = section.isFirst ? spacing["2"] : spacing["4"];
        const sfIcon = categoryIconToSfSymbol(section.icon);
        return (
            <View style={{ paddingVertical: spacing["4"], paddingTop, flexDirection: "row", alignItems: "center", gap: spacing["2"] }}>
                <IconSymbol name={sfIcon as any} color={colors.labels.primary} size={20} />
                <BaseText type="Body" weight={400} color="labels.primary">
                    {section.title}
                </BaseText>
            </View>
        );
    }, []);

    const keyExtractor = useCallback((item: ContractTemplate) => String(item.id), []);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ paddingTop: headerHeight }}>
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1" style={{ backgroundColor: colors.system.gray6, paddingTop: headerHeight }}>
                <ErrorState message={error?.message || "Failed to load contract templates"} onRetry={() => refetch()} />
            </View>
        );
    }

    const contracts = contractsData?.data ?? [];
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
            <SectionList<ContractTemplate, Section>
                sections={sections}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 20,
                    paddingTop: headerHeight,
                    paddingHorizontal: 16,
                    gap: spacing["1.5"],
                }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
