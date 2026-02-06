import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { formatDate } from "@/utils/helper/dateUtils";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
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
// Parsed metadata shape (phones, emails, addresses, urls)
interface ProfileMetadata {
    phones?: Array<{ type: string; value: string }>;
    emails?: Array<{ type: string; value: string }>;
    addresses?: Array<{ type: string; value: string }>;
    urls?: Array<{ type: string; value: string }>;
}

// Component for Profile Details
const ProfileDetails = ({ profile }: { profile?: People | null }) => {
    // Build full name
    const fullName = React.useMemo(() => {
        const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
        return parts.length > 0 ? parts.join(" ") : null;
    }, [profile?.first_name, profile?.last_name]);

    // Parse metadata (API may return string or object)
    const metadata = React.useMemo((): ProfileMetadata | null => {
        const raw = profile ? (profile as People & { metadata?: string | Record<string, unknown> | null }).metadata : undefined;
        if (raw == null) return null;
        if (typeof raw === "string") {
            try {
                return JSON.parse(raw) as ProfileMetadata;
            } catch {
                return null;
            }
        }
        return raw as ProfileMetadata;
    }, [profile]);

    // Format metadata label: "Category - Type" (e.g. "Phone - Mobile")
    const formatMetadataLabel = (category: string, type: string) => {
        const t = type?.trim() || category;
        const capitalized = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        return `${category} - ${capitalized}`;
    };

    // Flatten metadata into rows: { label, value, isLink }
    const metadataRows = React.useMemo(() => {
        const rows: { label: string; value: string; isLink?: boolean }[] = [];
        if (!metadata) return rows;

        metadata.phones?.forEach((item) => {
            if (item.value) rows.push({ label: formatMetadataLabel("Phone", item.type || "Phone"), value: e164ToDisplay(item.value) || item.value });
        });
        metadata.emails?.forEach((item) => {
            if (item.value) rows.push({ label: formatMetadataLabel("Email", item.type || "Email"), value: item.value });
        });
        metadata.addresses?.forEach((item) => {
            if (!item.value || item.value === "[object Object]") return;
            let displayValue: string = item.value;
            if (item.value.trim().startsWith("{")) {
                try {
                    const addr = JSON.parse(item.value) as { street1?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string };
                    const parts = [addr.street1, addr.street2, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
                    displayValue = parts.length > 0 ? parts.join(", ") : item.value;
                } catch {
                    displayValue = item.value;
                }
            }
            rows.push({ label: formatMetadataLabel("Address", item.type || "Address"), value: displayValue });
        });
        metadata.urls?.forEach((item) => {
            if (item.value) rows.push({ label: formatMetadataLabel("URL", item.type || "URL"), value: item.value, isLink: true });
        });
        return rows;
    }, [metadata]);

    // Format birth date with age
    const birthDateDisplay = React.useMemo(() => {
        if (!profile?.birth_date) return null;
        const formatted = formatDate(profile.birth_date);
        // Calculate age
        const birth = new Date(profile.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${formatted} (${age} yrs)`;
    }, [profile?.birth_date]);

    const profileFields: { label: string; value?: string | number | null; isLink?: boolean }[] = [
        { label: "Full Name", value: fullName },
        { label: "Email", value: profile?.email },
        { label: "Birth Date", value: birthDateDisplay },
        { label: "Verified", value: profile?.is_verified ? "Yes" : profile?.is_verified === false ? "No" : null },
        { label: "Member Since", value: profile?.created_at ? formatDate(profile.created_at) : null },
        ...metadataRows,
    ];

    // Filter only fields that have values
    const filledFields = profileFields.filter((field) => field.value !== undefined && field.value !== null && field.value !== "");

    return (
        <View className="gap-4">
            {filledFields.map((field, index) => (
                <DetailRow key={field.label + "-" + (typeof field.value === "string" ? field.value : index)} label={field.label} value={field.value ?? undefined} isLast={index === filledFields.length - 1} isLink={field.isLink} />
            ))}
        </View>
    );
};
