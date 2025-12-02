import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useGetPracticeList } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { People, Practice } from "@/utils/service/models/ResponseModels";
import { ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileDetailScreen() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated } = useAuth();
    const { setSettingView, settingView } = useProfileStore();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);

    const navigation = useNavigation();

    const handleEditPress = () => {
        if (settingView.type === "practice" && settingView.practice) {
            router.push({
                pathname: "/(modals)/edit-practice",
                params: { practice: JSON.stringify(settingView.practice) },
            });
        } else if (settingView.type === "profile" && profile) {
            router.push({
                pathname: "/(modals)/edit-profile",
                params: { profile: JSON.stringify(profile) },
            });
        }
    };

    // Check if user can edit (profile view or owner of practice)
    const canEdit = settingView.type === "profile" || (settingView.type === "practice" && settingView.practice?.role === "owner");

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Profile Details",
            headerRight: () =>
                canEdit ? (
                    <TouchableOpacity onPress={handleEditPress} className="flex-row px-2 justify-center items-center">
                        <IconSymbol name="square.and.pencil" size={24} color={colors.system.blue} />
                    </TouchableOpacity>
                ) : null,
        });
    }, [navigation, settingView, canEdit]);
    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: insets.top + headerHeight, gap: 16 }}>
            <View className="px-4">
                <Host style={{ width: "100%", height: 62 }}>
                    <ContextMenu activationMethod="longPress">
                        <ContextMenu.Items>
                            <Switch
                                label={"View as " + profile?.first_name + " " + profile?.last_name}
                                variant="switch"
                                value={settingView.type === "profile" && settingView.profile?.id === profile?.id}
                                onValueChange={() => {
                                    setSettingView({ type: "profile", profile: profile ?? null });
                                }}
                            />
                            {practiceList?.data.map((practice, index) => (
                                <Switch
                                    key={index}
                                    label={"View as " + practice.name}
                                    variant="switch"
                                    value={settingView.type === "practice" && settingView.practice?.id === practice.id}
                                    onValueChange={() => {
                                        setSettingView({ type: "practice", practice: practice });
                                    }}
                                />
                            ))}
                        </ContextMenu.Items>

                        <ContextMenu.Trigger>
                            <TouchableOpacity className={`w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] ${settingView.type === "profile" ? "rounded-full" : "rounded-[12px]"}`}>
                                <View className="flex-row items-center gap-2">
                                    <Avatar size={54} rounded={settingView.type === "profile" ? 99 : 8} name={profile?.first_name ?? ""} haveRing={settingView.type === "profile"} color={settingView.type === "profile" && profile?.colors ? profile?.colors : undefined} />
                                    <View className="flex-1 ">
                                        <BaseText type="Title3" weight="500" color="system.black">
                                            {settingView.type === "profile" ? profile?.first_name + " " + profile?.last_name : settingView.practice?.name}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                            {settingView.type}
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

            <View className="pt-2 border-t border-system-gray5 px-4">{settingView.type === "profile" ? <ProfileDetails profile={profile} /> : <PracticeDetails practice={settingView.practice} />}</View>
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
        <View className={`pb-2 ${!isLast ? "border-b border-system-gray5" : ""}`}>
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
// Component for Profile Details
const ProfileDetails = ({ profile }: { profile?: People | null }) => {
    // Build full name
    const fullName = React.useMemo(() => {
        const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
        return parts.length > 0 ? parts.join(" ") : null;
    }, [profile?.first_name, profile?.last_name]);

    const profileFields: { label: string; value?: string | number | null }[] = [
        { label: "Full Name", value: fullName },
        { label: "Email", value: profile?.email },
        { label: "Verified", value: profile?.is_verified ? "Yes" : profile?.is_verified === false ? "No" : null },
        { label: "Member Since", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : null },
    ];

    // Filter only fields that have values
    const filledFields = profileFields.filter((field) => field.value !== undefined && field.value !== null && field.value !== "");

    return (
        <View className="gap-4">
            {filledFields.map((field, index) => (
                <DetailRow key={field.label} label={field.label} value={field.value} isLast={index === filledFields.length - 1} />
            ))}
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
        const parts = [metadata?.address, metadata?.city, metadata?.country, metadata?.zipcode].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : null;
    }, [metadata]);

    const practiceFields: { label: string; value?: string | number | null; isLink?: boolean }[] = [
        { label: "Practice Name", value: practice?.name },
        { label: "Type", value: practice?.type },
        { label: "Website", value: metadata?.website ? `https://${metadata.website}` : null, isLink: true },
        { label: "Phone Number", value: metadata?.phone },
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
