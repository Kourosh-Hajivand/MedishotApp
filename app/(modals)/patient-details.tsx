import { BaseText } from "@/components";
import { ErrorState } from "@/components/ErrorState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { e164ToDisplay } from "@/utils/helper/phoneUtils";
import { useGetPatientById } from "@/utils/hook";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PatientDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { data: patient, isLoading, error, refetch } = useGetPatientById(id || "");

    const handleCall = useCallback(async (phoneNumber: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = `tel:${phoneNumber}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot make phone call");
            }
        } catch {
            Alert.alert("Error", "Error making phone call");
        }
    }, []);

    const handleMessage = useCallback(async (phoneNumber: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = `sms:${phoneNumber}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot send message");
            }
        } catch {
            Alert.alert("Error", "Error sending message");
        }
    }, []);

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        } catch {
            return dateString;
        }
    };

    const calculateAge = (birthDate: string | null | undefined) => {
        if (!birthDate) return null;
        try {
            const birth = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        } catch {
            return null;
        }
    };

    const formatGender = (gender: "male" | "female" | "other" | null | undefined) => {
        if (!gender) return null;
        return gender.charAt(0).toUpperCase() + gender.slice(1);
    };

    interface AddressValue {
        street?: string;
        street1?: string;
        street2?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    }

    interface AddressObject {
        type: string;
        value: string | AddressValue;
    }

    const formatAddress = (address: string | AddressObject | unknown): { type: string; formatted: string } | null => {
        if (!address) return null;

        // If address is a string, return it as is
        if (typeof address === "string") {
            return { type: "address", formatted: address };
        }

        // If address is an object with type and value
        if (typeof address === "object" && address !== null && "type" in address && "value" in address) {
            const addressObj = address as AddressObject;
            const addressType = addressObj.type;
            const addressValue = addressObj.value;

            // If value is an object with address fields
            if (typeof addressValue === "object" && addressValue !== null) {
                const addressValueObj = addressValue as AddressValue;
                const parts: string[] = [];

                // Street addresses first
                if (addressValueObj.street) parts.push(addressValueObj.street);
                if (addressValueObj.street1) parts.push(addressValueObj.street1);
                if (addressValueObj.street2) parts.push(addressValueObj.street2);

                // City, State, ZIP together
                const cityStateZip: string[] = [];
                if (addressValueObj.city) cityStateZip.push(addressValueObj.city);
                if (addressValueObj.state) cityStateZip.push(addressValueObj.state);
                if (addressValueObj.zip) cityStateZip.push(addressValueObj.zip);

                if (cityStateZip.length > 0) {
                    parts.push(cityStateZip.join(", "));
                }

                // Country last
                if (addressValueObj.country) parts.push(addressValueObj.country);

                const formatted = parts.filter(Boolean).join(", ");
                return { type: addressType, formatted: formatted || JSON.stringify(addressValueObj) };
            }

            // If value is a string (plain or JSON)
            if (typeof addressValue === "string") {
                const trimmed = addressValue.trim();
                if (trimmed.startsWith("{")) {
                    try {
                        const parsed = JSON.parse(trimmed) as AddressValue;
                        const parts: string[] = [];
                        if (parsed.street) parts.push(parsed.street);
                        if (parsed.street1) parts.push(parsed.street1);
                        if (parsed.street2) parts.push(parsed.street2);
                        const cityStateZip: string[] = [];
                        if (parsed.city) cityStateZip.push(parsed.city);
                        if (parsed.state) cityStateZip.push(parsed.state);
                        if (parsed.zip) cityStateZip.push(parsed.zip);
                        if (cityStateZip.length > 0) parts.push(cityStateZip.join(", "));
                        if (parsed.country) parts.push(parsed.country);
                        const formatted = parts.filter(Boolean).join(", ");
                        return { type: addressType, formatted: formatted || trimmed };
                    } catch {
                        return { type: addressType, formatted: addressValue };
                    }
                }
                return { type: addressType, formatted: addressValue };
            }
        }

        // Fallback: stringify the address
        return { type: "address", formatted: JSON.stringify(address) };
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <BaseText type="Title1" weight="600" color="labels.primary">
                        Patient Details
                    </BaseText>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <IconSymbol name="xmark" size={20} color={colors.labels.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <BaseText type="Body" color="labels.secondary">
                        Loading...
                    </BaseText>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <BaseText type="Title1" weight="600" color="labels.primary">
                        Patient Details
                    </BaseText>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <IconSymbol name="xmark" size={20} color={colors.labels.primary} />
                    </TouchableOpacity>
                </View>
                <ErrorState message={error?.message || "Failed to load patient details"} onRetry={() => refetch()} />
            </View>
        );
    }

    if (!patient?.data) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <BaseText type="Title1" weight="600" color="labels.primary">
                        Patient Details
                    </BaseText>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <IconSymbol name="xmark" size={20} color={colors.labels.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <BaseText type="Body" color="labels.secondary">
                        Patient not found
                    </BaseText>
                </View>
            </View>
        );
    }

    const patientData = patient.data;
    const age = useMemo(() => calculateAge(patientData.birth_date), [patientData.birth_date]);
    const birthDateFormatted = useMemo(() => formatDate(patientData.birth_date), [patientData.birth_date]);
    const genderFormatted = useMemo(() => formatGender(patientData.gender), [patientData.gender]);

    return (
        <ScrollView style={[styles.scrollView, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
                {/* Phone Numbers */}
                {patientData.numbers && patientData.numbers.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.phoneNumbersContainer}>
                            {patientData.numbers.map((number, index) => {
                                const phoneNumberRaw = typeof number === "string" ? number : number.value;
                                const phoneType = typeof number === "object" ? number.type : "phone";
                                if (!phoneNumberRaw) return null;

                                // Display formatted phone number, but use raw E.164 for actions (call/message)
                                const phoneNumberDisplay = e164ToDisplay(phoneNumberRaw) || phoneNumberRaw;

                                return (
                                    <View key={index} style={styles.phoneRow} className={`${index < patientData.numbers.length - 1 ? "border-b border-border" : ""}`}>
                                        <View style={styles.phoneInfo}>
                                            <BaseText type="Subhead" color="labels.secondary">
                                                {phoneType.charAt(0).toUpperCase() + phoneType.slice(1)}
                                            </BaseText>
                                            <BaseText type="Subhead" color="labels.primary">
                                                {phoneNumberDisplay}
                                            </BaseText>
                                        </View>
                                        <View style={styles.actionButtonsContainer}>
                                            <TouchableOpacity onPress={() => handleCall(phoneNumberRaw)} style={styles.actionButton}>
                                                <IconSymbol name="phone.fill" size={16} color={colors.system.blue} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleMessage(phoneNumberRaw)} style={styles.actionButton}>
                                                <IconSymbol name="message.fill" size={16} color={colors.system.blue} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Emails */}
                {patientData.email && (Array.isArray(patientData.email) ? patientData.email.length > 0 : true) && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.section}>
                            {Array.isArray(patientData.email) ? (
                                patientData.email.map((email: { type?: string; value?: string } | string, index: number) => {
                                    const emailValue = typeof email === "object" && email !== null && "value" in email ? (email as { value?: string }).value : typeof email === "string" ? email : "";
                                    const emailType = typeof email === "object" && email !== null && "type" in email ? (email as { type?: string }).type : "Email";
                                    if (!emailValue) return null;
                                    const label = (emailType || "Email").charAt(0).toUpperCase() + (emailType || "Email").slice(1).toLowerCase();
                                    return (
                                        <InfoRow key={index} label={label} value={emailValue} isLast={index === patientData.email.length - 1} />
                                    );
                                })
                            ) : (
                                <InfoRow label="Email" value={patientData.email as string} isLast={true} />
                            )}
                        </View>
                    </View>
                )}

                {/* Addresses */}
                <View style={styles.sectionContainer}>
                    {genderFormatted && <InfoRow label="Gender" value={genderFormatted} isLast={false} />}
                    {birthDateFormatted && age !== null && <InfoRow label="Birth Date" value={`${birthDateFormatted} (${age} years old)`} isLast={false} />}
                    {patientData.addresses && patientData.addresses.length > 0 && (
                        <View style={styles.section}>
                            {patientData.addresses.map((address, index) => {
                                const formattedAddress = formatAddress(address);
                                if (!formattedAddress) return null;
                                return <InfoRow key={index} label={formattedAddress.type.charAt(0).toUpperCase() + formattedAddress.type.slice(1)} value={formattedAddress.formatted} isLast={index === patientData.addresses.length - 1} />;
                            })}
                        </View>
                    )}
                </View>

                {/* Links */}
                {patientData.links && patientData.links.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.section}>
                            {patientData.links.map((link, index) => {
                                if (!link) return null;
                                const linkValue = typeof link === "string" ? link : typeof link === "object" && link !== null && "value" in link ? String((link as { value: unknown }).value) : String(link);
                                const linkType = typeof link === "object" && link !== null && "type" in link ? String((link as { type: unknown }).type) : "link";
                                if (!linkValue) return null;
                                return <InfoRow key={index} label={linkType} value={linkValue} isLast={index === patientData.links.length - 1} />;
                            })}
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

interface InfoRowProps {
    label: string;
    value: string;
    isLast?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, isLast = false }) => {
    if (!value) return null;
    return (
        <View style={styles.infoRow} className={`${!isLast ? "border-b border-border" : ""}`}>
            {label && (
                <BaseText type="Subhead" color="labels.secondary" style={styles.label} className="capitalize">
                    {label}
                </BaseText>
            )}
            <BaseText type="Subhead" color="labels.primary" style={styles.value}>
                {value}
            </BaseText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.system.white,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    closeButton: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    sectionContainer: {
        marginBottom: 0,
        backgroundColor: "white",
        borderRadius: 8,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        marginBottom: 12,
    },
    section: {
        // backgroundColor: "red",
    },
    infoRow: {
        flexDirection: "column",
        paddingVertical: 8,
        flexWrap: "wrap",
    },
    label: {
        marginRight: 8,
        minWidth: 120,
    },
    value: {
        flex: 1,
    },
    phoneNumbersContainer: {
        // gap: 8,
    },
    phoneRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "white",
        paddingVertical: 8,
    },
    phoneInfo: {
        flex: 1,
        marginRight: 12,
    },
    actionButtonsContainer: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 34,
        height: 34,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.system.blue + "15",
        borderRadius: 20,
    },
});
