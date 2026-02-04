import { BaseText, PracticeDocumentFooter, PracticeDocumentHeader } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useGetPracticeById, useUpdatePractice } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Host, HStack, Picker, Switch, Text, VStack } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEBOUNCE_MS = 500;

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
    const { profile: me } = useAuth();
    const { data: practiceData } = useGetPracticeById(selectedPractice?.id || 0, !!selectedPractice?.id);
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

    // Whether practice has data for each option (disable switch if not)
    const hasData = useMemo(
        () => ({
            address: !!(metadata?.address && String(metadata.address).trim()),
            practicePhone: !!(metadata?.phone && String(metadata.phone).trim()),
            practiceURL: !!(metadata?.website && String(metadata.website).trim()),
            practiceEmail: !!(metadata?.email && String(metadata.email).trim()),
        }),
        [metadata],
    );

    // Local state for settings
    const [settings, setSettings] = useState<PracticeSettings>(printSettings);
    const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const settingsRef = useRef<PracticeSettings>(printSettings);
    const rotationAnim = React.useRef(new Animated.Value(isPreviewExpanded ? 1 : 0)).current;
    const expandAnim = React.useRef(new Animated.Value(isPreviewExpanded ? 1 : 0)).current;

    // Get avatar index for picker
    const avatarIndex = useMemo(() => {
        return settings.avatar === "logo" ? 1 : 0;
    }, [settings.avatar]);

    // Animate chevron rotation and body expand/collapse
    React.useEffect(() => {
        // All animations without native driver (since height is involved)
        Animated.parallel([
            Animated.timing(expandAnim, {
                toValue: isPreviewExpanded ? 1 : 0,
                duration: 300,
                useNativeDriver: false,
            }),
            Animated.timing(rotationAnim, {
                toValue: isPreviewExpanded ? 1 : 0,
                duration: 300,
                useNativeDriver: false,
            }),
        ]).start();
    }, [isPreviewExpanded, rotationAnim, expandAnim]);

    const rotateInterpolate = rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    const heightInterpolate = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 350],
    });

    const opacityInterpolate = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const paddingInterpolate = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 40],
    });

    // Update local state when data changes
    useEffect(() => {
        setSettings(printSettings);
        settingsRef.current = printSettings;
    }, [printSettings]);

    const { mutate: updatePractice, isPending } = useUpdatePractice(() => {
        // Success - settings are already updated locally
    });

    const flushSave = useCallback(() => {
        if (!selectedPractice?.id || !practiceData?.data) return;
        const toSave = settingsRef.current;
        const updatedMetadata = {
            ...metadata,
            print_settings: toSave,
            notification_settings: metadata?.notification_settings,
        };
        updatePractice({
            id: selectedPractice.id,
            data: {
                name: practiceData.data.name,
                metadata: JSON.stringify(updatedMetadata),
            },
        });
    }, [selectedPractice?.id, practiceData?.data, metadata, updatePractice]);

    const scheduleSave = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            flushSave();
        }, DEBOUNCE_MS);
    }, [flushSave]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleToggle = (key: keyof Omit<PracticeSettings, "avatar">, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        settingsRef.current = newSettings;
        scheduleSave();
    };

    const handleAvatarChange = (index: number) => {
        const newAvatar: "profile_picture" | "logo" = index === 1 ? "logo" : "profile_picture";
        const newSettings = { ...settings, avatar: newAvatar };
        setSettings(newSettings);
        settingsRef.current = newSettings;
        scheduleSave();
    };

    const practice = practiceData?.data;

    return (
        <ScrollView className="flex-1 bg-white py-5" contentContainerStyle={{ paddingBottom: insets.bottom + 20, gap: 20, paddingTop: insets.top + headerHeight - 20 }}>
            {/* A4 Preview Section */}
            <View className="px-5" style={styles.previewSection}>
                <BaseText type="Caption2" color="labels.secondary" style={styles.previewLabel}>
                    Preview:
                </BaseText>
                <View style={styles.previewCard}>
                    {/* Header */}
                    {practice && <PracticeDocumentHeader practice={practice} printSettings={settings} me={me || undefined} variant="preview" />}

                    {/* Body - Placeholder content */}
                    <Animated.View
                        style={[
                            styles.previewBody,
                            {
                                maxHeight: heightInterpolate,
                                height: heightInterpolate,
                                opacity: opacityInterpolate,
                                padding: paddingInterpolate,
                                overflow: "hidden",
                                pointerEvents: isPreviewExpanded ? "auto" : "none",
                            },
                        ]}
                    >
                        <View style={styles.previewBodyContent}>
                            <View style={[styles.previewPlaceholderLine, { width: "50%", height: 15 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={[styles.previewPlaceholderLine, { width: "100%", height: 5 }]} />
                            <View style={{ flexDirection: "row", gap: 16 }}>
                                <View style={[styles.previewPlaceholderLine, { width: "40%", height: 15 }]} />
                                <View style={[styles.previewPlaceholderLine, { width: "40%", height: 15 }]} />
                            </View>
                            <View style={{ flexDirection: "row", gap: 16 }}>
                                <View style={[styles.previewPlaceholderLine, { width: "40%", height: 15 }]} />
                                <View style={[styles.previewPlaceholderLine, { width: "40%", height: 15 }]} />
                            </View>
                        </View>
                    </Animated.View>

                    {/* Footer */}
                    <PracticeDocumentFooter metadata={metadata} printSettings={settings} variant="preview" showIcons={true} />
                </View>
            </View>

            {/* Expandable Separator Line */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setIsPreviewExpanded(!isPreviewExpanded)} style={styles.expandableSeparator}>
                <View style={styles.separatorLine} />
                <View style={styles.chevronButton}>
                    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                        <IconSymbol name="chevron.up" size={15} color={colors.system.black} />
                    </Animated.View>
                </View>
            </TouchableOpacity>
            <View className="px-5">
                <Host matchContents>
                    <VStack spacing={16}>
                        {/* Avatar Picker */}
                        <HStack spacing={100}>
                            <Text modifiers={[foregroundStyle(colors.system.black)]} size={18} weight="regular">
                                Avatar
                            </Text>
                            <Picker label="Select avatar" selectedIndex={avatarIndex} variant="segmented" onOptionSelected={({ nativeEvent: { index } }) => handleAvatarChange(index)} options={avatarOptions} />
                        </HStack>

                        {/* Boolean switches - when no data, onValueChange is undefined so switch is effectively disabled (no View wrapper: Host/VStack require SwiftUI children) */}
                        <Switch label="Practice Name" variant="switch" value={settings.practiceName} onValueChange={isPending ? undefined : (value) => handleToggle("practiceName", value)} />
                        <Switch label="Doctor Name" variant="switch" value={settings.doctorName} onValueChange={isPending ? undefined : (value) => handleToggle("doctorName", value)} />
                        <Switch label="Address" variant="switch" value={settings.address} onValueChange={hasData.address && !isPending ? (value) => handleToggle("address", value) : undefined} />
                        <Switch label="Practice Phone" variant="switch" value={settings.practicePhone} onValueChange={hasData.practicePhone && !isPending ? (value) => handleToggle("practicePhone", value) : undefined} />
                        <Switch label="Practice URL" variant="switch" value={settings.practiceURL} onValueChange={hasData.practiceURL && !isPending ? (value) => handleToggle("practiceURL", value) : undefined} />
                        <Switch label="Practice Email" variant="switch" value={settings.practiceEmail} onValueChange={hasData.practiceEmail && !isPending ? (value) => handleToggle("practiceEmail", value) : undefined} />
                        {/* <Switch label="Practice Social Media" variant="switch" value={settings.practiceSocialMedia} onValueChange={isPending ? undefined : (value) => handleToggle("practiceSocialMedia", value)} /> */}
                    </VStack>
                </Host>
            </View>
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
        paddingTop: 16,
    },
    description: {
        marginTop: 8,
    },
    previewSection: {
        gap: 4,
    },
    previewLabel: {
        fontSize: 11,
        lineHeight: 13,
        letterSpacing: 0.06,
        marginBottom: 4,
    },
    previewCard: {
        backgroundColor: colors.system.white,
        borderWidth: 1,
        borderColor: colors.system.gray6,
        borderRadius: 6,
        overflow: "hidden",
    },
    previewBody: {
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
    },
    previewBodyContent: {
        width: "100%",
        gap: 16,

        alignItems: "flex-start",
    },
    previewPlaceholderLine: {
        backgroundColor: "#d9d9d9",
        borderRadius: 20,
    },
    expandableSeparator: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 8,
        height: 33,
    },
    separatorLine: {
        position: "absolute",
        width: "100%",
        height: 3,
        backgroundColor: colors.system.gray5,
        top: "50%",
    },
    chevronButton: {
        backgroundColor: colors.system.white,
        borderWidth: 3,
        borderColor: "#ebebeb",
        borderRadius: 9999,
        width: 33,
        height: 33,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
});
