import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useAuth } from "@/utils/hook/useAuth";
import { People } from "@/utils/service/models/ResponseModels";
import { router, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileDetailScreen() {
    const insets = useSafeAreaInsets();
    const { profile } = useAuth();
    const navigation = useNavigation();
    console.log("profile", profile);
    const handleEditPress = React.useCallback(() => {
        if (profile) {
            router.push({
                pathname: "/(modals)/edit-profile",
                params: { profile: JSON.stringify(profile) },
            });
        }
    }, [profile]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Profile Details",
            headerRight: () => (
                <TouchableOpacity onPress={handleEditPress} className="flex-row px-2 justify-center items-center">
                    <IconSymbol name="square.and.pencil" size={24} color={colors.system.blue} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, handleEditPress]);

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: insets.top + headerHeight, gap: 16 }}>
            <View className="px-4">
                <View className="w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] rounded-full">
                    <View className="flex-row items-center gap-2">
                        <Avatar size={60} rounded={99} name={profile?.first_name ?? ""} imageUrl={profile?.profile_photo_url ?? undefined} />
                        <View className="flex-1">
                            <BaseText type="Title3" weight="500" color="system.black">
                                {profile?.first_name + " " + profile?.last_name}
                            </BaseText>
                            <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                Profile
                            </BaseText>
                        </View>
                    </View>
                </View>
            </View>

            <View className="pt-4 border-t border-system-gray5 px-4">
                <ProfileDetails profile={profile} />
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
