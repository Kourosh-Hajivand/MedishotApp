import { KeyboardAwareScrollView } from "@/components";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useGetPracticeById, useUpdatePractice } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Host, HStack, Picker, Switch, Text, VStack } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import React, { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PracticeSettings {
    avatar: "profile_picture" | "logo";
    practiceName: boolean;
    doctorName: boolean;
    address: boolean;
    practicePhone: boolean;
    practiceURL: boolean;
    practiceEmail: boolean;
    practiceSocialMedia: boolean;
}

const defaultPracticeSettings: PracticeSettings = {
    avatar: "profile_picture",
    practiceName: true,
    doctorName: true,
    address: true,
    practicePhone: true,
    practiceURL: false,
    practiceEmail: false,
    practiceSocialMedia: false,
};

const avatarOptions = ["Profile Picture", "Logo"];

export default function PrintInformationScreen() {
    const insets = useSafeAreaInsets();
    const { selectedPractice } = useProfileStore();
    const { data: practiceData } = useGetPracticeById(selectedPractice?.id || 0, !!selectedPractice?.id);
    console.log("====================================");
    console.log(practiceData?.data?.metadata);
    console.log("====================================");
    // Parse metadata
    const metadata = useMemo(() => {
        if (!practiceData?.data?.metadata) return null;
        if (typeof practiceData.data.metadata === "string") {
            try {
                return JSON.parse(practiceData.data.metadata);
            } catch {
                return null;
            }
        }
        return practiceData.data.metadata;
    }, [practiceData?.data?.metadata]);

    // Get print settings from metadata
    const printSettings: PracticeSettings = useMemo(() => {
        return metadata?.print_settings || defaultPracticeSettings;
    }, [metadata]);

    // Local state for settings
    const [settings, setSettings] = useState<PracticeSettings>(printSettings);

    // Get avatar index for picker
    const avatarIndex = useMemo(() => {
        return settings.avatar === "logo" ? 1 : 0;
    }, [settings.avatar]);

    // Update local state when data changes
    React.useEffect(() => {
        setSettings(printSettings);
    }, [printSettings]);

    const { mutate: updatePractice, isPending } = useUpdatePractice(() => {
        // Success - settings are already updated locally
    });

    const handleToggle = (key: keyof Omit<PracticeSettings, "avatar">, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        if (selectedPractice?.id && practiceData?.data) {
            // Update practice metadata - preserve all existing metadata including notification_settings
            const updatedMetadata = {
                ...metadata,
                print_settings: newSettings,
                // Preserve notification_settings if it exists
                notification_settings: metadata?.notification_settings,
            };

            updatePractice({
                id: selectedPractice.id,
                data: {
                    name: practiceData.data.name,
                    metadata: JSON.stringify(updatedMetadata),
                },
            });
        }
    };

    const handleAvatarChange = (index: number) => {
        const newAvatar: "profile_picture" | "logo" = index === 1 ? "logo" : "profile_picture";
        const newSettings = { ...settings, avatar: newAvatar };
        setSettings(newSettings);

        if (selectedPractice?.id && practiceData?.data) {
            const updatedMetadata = {
                ...metadata,
                print_settings: newSettings,
                notification_settings: metadata?.notification_settings,
            };

            updatePractice({
                id: selectedPractice.id,
                data: {
                    name: practiceData.data.name,
                    metadata: JSON.stringify(updatedMetadata),
                },
            });
        }
    };

    return (
        <KeyboardAwareScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} backgroundColor="#ffffff">
            <Host style={{ flex: 1, paddingTop: insets.top + headerHeight + 160 }}>
                <VStack spacing={16}>
                    {/* Avatar Picker */}
                    <HStack spacing={100}>
                        <Text modifiers={[foregroundStyle(colors.system.black)]} size={18} weight="regular">
                            Avatar
                        </Text>
                        <Picker label="Select avatar" selectedIndex={avatarIndex} variant="segmented" onOptionSelected={({ nativeEvent: { index } }) => handleAvatarChange(index)} options={avatarOptions} />
                    </HStack>

                    {/* Boolean switches */}
                    <Switch label="Practice Name" variant="switch" value={settings.practiceName} onValueChange={isPending ? undefined : (value) => handleToggle("practiceName", value)} />
                    <Switch label="Doctor Name" variant="switch" value={settings.doctorName} onValueChange={isPending ? undefined : (value) => handleToggle("doctorName", value)} />
                    <Switch label="Address" variant="switch" value={settings.address} onValueChange={isPending ? undefined : (value) => handleToggle("address", value)} />
                    <Switch label="Practice Phone" variant="switch" value={settings.practicePhone} onValueChange={isPending ? undefined : (value) => handleToggle("practicePhone", value)} />
                    <Switch label="Practice URL" variant="switch" value={settings.practiceURL} onValueChange={isPending ? undefined : (value) => handleToggle("practiceURL", value)} />
                    <Switch label="Practice Email" variant="switch" value={settings.practiceEmail} onValueChange={isPending ? undefined : (value) => handleToggle("practiceEmail", value)} />
                    <Switch label="Practice Social Media" variant="switch" value={settings.practiceSocialMedia} onValueChange={isPending ? undefined : (value) => handleToggle("practiceSocialMedia", value)} />
                </VStack>
            </Host>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    description: {
        marginTop: 8,
    },
});
