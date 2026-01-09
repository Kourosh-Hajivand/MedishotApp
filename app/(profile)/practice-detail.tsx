import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
import { useGetPracticeById, useGetPracticeList } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Practice } from "@/utils/service/models/ResponseModels";
import { ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useMemo } from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PracticeDetailScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ practice?: string; practiceId?: string }>();
    const { selectedPractice, setSelectedPractice } = useProfileStore();
    const { isAuthenticated } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);
    const navigation = useNavigation();

    // Get practice from params or store
    const practice: Practice | null = useMemo(() => {
        // First try to get from params
        if (params.practice) {
            try {
                return JSON.parse(params.practice);
            } catch {
                return null;
            }
        }
        // If practiceId is provided, fetch it
        if (params.practiceId) {
            return null; // Will be fetched by useGetPracticeById
        }
        // Fallback to store
        return selectedPractice;
    }, [params.practice, params.practiceId, selectedPractice]);

    // Fetch practice if practiceId is provided
    const { data: fetchedPractice } = useGetPracticeById(params.practiceId ? parseInt(params.practiceId) : 0, !!params.practiceId && !practice);

    // Use fetched practice if available, otherwise use store practice
    const currentPractice = fetchedPractice?.data || practice || selectedPractice;

    const handleEditPress = React.useCallback(() => {
        if (currentPractice?.role === "owner" && currentPractice) {
            router.push({
                pathname: "/(modals)/edit-practice",
                params: { practice: JSON.stringify(currentPractice) },
            });
        }
    }, [currentPractice]);

    // Check if user can edit (only owners)
    const canEdit = currentPractice?.role === "owner";
    console.log("====================================");
    console.log(currentPractice);
    console.log("====================================");
    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Practice Details",
            headerRight: () =>
                canEdit ? (
                    <TouchableOpacity onPress={handleEditPress} className="flex-row px-2 justify-center items-center">
                        <IconSymbol name="square.and.pencil" size={24} color={colors.system.blue} />
                    </TouchableOpacity>
                ) : null,
        });
    }, [navigation, canEdit, handleEditPress]);

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: insets.top + headerHeight, gap: 16 }}>
            <View className="px-4">
                <Host style={{ width: "100%", height: 68 }}>
                    <ContextMenu activationMethod="longPress">
                        <ContextMenu.Items>
                            {practiceList?.data.map((practiceItem, index) => (
                                <Switch
                                    key={index}
                                    label={practiceItem.name}
                                    variant="switch"
                                    value={currentPractice?.id === practiceItem.id}
                                    onValueChange={() => {
                                        setSelectedPractice(practiceItem);
                                        // Navigate to the selected practice
                                        router.push({
                                            pathname: "/(profile)/practice-detail",
                                            params: { practice: JSON.stringify(practiceItem) },
                                        });
                                    }}
                                />
                            ))}
                        </ContextMenu.Items>

                        <ContextMenu.Trigger>
                            <TouchableOpacity className="w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] rounded-[12px]">
                                <View className="flex-row items-center gap-2">
                                    <Avatar size={60} rounded={8} name={currentPractice?.name ?? ""} imageUrl={currentPractice?.image?.url ?? undefined} />
                                    <View className="flex-1">
                                        <BaseText type="Title3" weight="500" color="system.black" lineBreakMode="tail" numberOfLines={1}>
                                            {currentPractice?.name}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                            {currentPractice?.role}
                                        </BaseText>
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <IconSymbol name="chevron.up.chevron.down" size={14} color={colors.labels.secondary} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu.Trigger>
                    </ContextMenu>
                </Host>
            </View>

            <View className="pt-4  border-t border-system-gray5 px-4">
                <PracticeDetails practice={currentPractice} />
            </View>
        </ScrollView>
    );
}

// Detail Row Component
const DetailRow = ({ label, value, isLast = false, isLink = false }: { label: string; value?: string | number | null; isLast?: boolean; isLink?: boolean }) => {
    if (!value) return null;

    const handleLinkPress = () => {
        if (isLink && typeof value === "string") {
            Linking.openURL(value);
        }
    };

    return (
        <View className={`pb-4 ${!isLast ? "border-b border-system-gray5" : ""}`}>
            <BaseText type="Subhead" weight="400" color="labels.secondary">
                {label}
            </BaseText>
            {isLink ? (
                <TouchableOpacity onPress={handleLinkPress}>
                    <BaseText type="Callout" weight="400" color="system.blue">
                        {value}
                    </BaseText>
                </TouchableOpacity>
            ) : (
                <BaseText type="Callout" weight="400" color="system.black">
                    {value}
                </BaseText>
            )}
        </View>
    );
};

// Component for Practice Details
const PracticeDetails = ({ practice }: { practice?: Practice | null }) => {
    // Parse metadata if it's a string
    const metadata = React.useMemo(() => {
        if (!practice?.metadata) return null;
        if (typeof practice.metadata === "string") {
            try {
                return JSON.parse(practice.metadata);
            } catch {
                return null;
            }
        }
        return practice.metadata;
    }, [practice?.metadata]);

    // Build compact address from address parts
    const fullAddress = React.useMemo(() => {
        const parts = [metadata?.street, metadata?.address, metadata?.city, metadata?.country, metadata?.zipcode].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : null;
    }, [metadata]);

    const practiceFields: { label: string; value?: string | number | null; isLink?: boolean }[] = [
        { label: "Practice Name", value: practice?.name },
        { label: "Speciality", value: practice?.type },
        { label: "Website", value: metadata?.website ? metadata.website : null, isLink: true },
        { label: "Phone Number", value: metadata?.phone ? e164ToDisplay(metadata.phone) || metadata.phone : null },
        { label: "Email", value: metadata?.email },
        { label: "Address", value: fullAddress },
        { label: "Patients Count", value: practice?.patients_count },
        { label: "Your Role", value: practice?.role },
    ];

    // Filter only fields that have values
    const filledFields = practiceFields.filter((field) => field.value !== undefined && field.value !== null && field.value !== "");

    return (
        <View className="gap-4">
            {filledFields.map((field, index) => (
                <DetailRow key={field.label} label={field.label} value={field.value} isLast={index === filledFields.length - 1} isLink={field.isLink} />
            ))}
        </View>
    );
};
