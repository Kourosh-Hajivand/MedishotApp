import { headerHeight } from "@/constants/theme";
import { useGetPracticeById, useUpdatePractice } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Host, Switch, VStack } from "@expo/ui/swift-ui";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NotificationSettings {
    imageAdded: boolean;
    notes: boolean;
    imageEnhanced: boolean;
    consentFilled: boolean;
    patientAdded: boolean;
}

export default function NotificationScreen() {
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

    // Get notification settings from metadata
    const notificationSettings: NotificationSettings = useMemo(() => {
        return (
            metadata?.notification_settings || {
                imageAdded: true,
                notes: true,
                imageEnhanced: true,
                consentFilled: true,
                patientAdded: false,
            }
        );
    }, [metadata]);

    // Local state for switches
    const [settings, setSettings] = useState<NotificationSettings>(notificationSettings);

    // Update local state when data changes
    React.useEffect(() => {
        setSettings(notificationSettings);
    }, [notificationSettings]);

    const { mutate: updatePractice, isPending } = useUpdatePractice(() => {
        // Success - settings are already updated locally
    });

    const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        if (selectedPractice?.id && practiceData?.data) {
            // Update practice metadata - preserve all existing metadata including print_settings
            const updatedMetadata = {
                ...metadata,
                notification_settings: newSettings,
                // Preserve print_settings if it exists
                print_settings: metadata?.print_settings,
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
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Host style={{ flex: 1, paddingTop: insets.top + headerHeight + 50 }}>
                <VStack spacing={16}>
                    <Switch label="Image Added" variant="switch" value={settings.imageAdded} onValueChange={isPending ? undefined : (value) => handleToggle("imageAdded", value)} />
                    <Switch label="Note's" variant="switch" value={settings.notes} onValueChange={isPending ? undefined : (value) => handleToggle("notes", value)} />
                    <Switch label="Image Enhanced" variant="switch" value={settings.imageEnhanced} onValueChange={isPending ? undefined : (value) => handleToggle("imageEnhanced", value)} />
                    <Switch label="Consent Filled" variant="switch" value={settings.consentFilled} onValueChange={isPending ? undefined : (value) => handleToggle("consentFilled", value)} />
                    <Switch label="Patient Added" variant="switch" value={settings.patientAdded} onValueChange={isPending ? undefined : (value) => handleToggle("patientAdded", value)} />
                </VStack>
            </Host>
        </ScrollView>
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
