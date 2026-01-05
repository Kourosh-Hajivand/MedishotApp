import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useGetPatientById } from "@/utils/hook";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PatientDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { data: patient, isLoading } = useGetPatientById(id || "");

    const handleCall = async (phoneNumber: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = `tel:${phoneNumber}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot make phone call");
            }
        } catch (error) {
            console.error("Error making phone call:", error);
            Alert.alert("Error", "Error making phone call");
        }
    };

    const handleMessage = async (phoneNumber: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = `sms:${phoneNumber}`;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot send message");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Error", "Error sending message");
        }
    };

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

    const formatAddress = (address: string | any): { type: string; formatted: string } | null => {
        if (!address) return null;

        // If address is a string, return it as is
        if (typeof address === "string") {
            return { type: "address", formatted: address };
        }

        // If address is an object with type and value
        if (typeof address === "object" && address.type && address.value) {
            const addressType = address.type;
            const addressValue = address.value;

            // If value is an object with address fields
            if (typeof addressValue === "object") {
                const parts: string[] = [];

                // Street addresses first
                if (addressValue.street) parts.push(addressValue.street);
                if (addressValue.street1) parts.push(addressValue.street1);
                if (addressValue.street2) parts.push(addressValue.street2);

                // City, State, ZIP together
                const cityStateZip: string[] = [];
                if (addressValue.city) cityStateZip.push(addressValue.city);
                if (addressValue.state) cityStateZip.push(addressValue.state);
                if (addressValue.zip) cityStateZip.push(addressValue.zip);

                if (cityStateZip.length > 0) {
                    parts.push(cityStateZip.join(", "));
                }

                // Country last
                if (addressValue.country) parts.push(addressValue.country);

                const formatted = parts.filter(Boolean).join(", ");
                return { type: addressType, formatted: formatted || JSON.stringify(addressValue) };
            }

            // If value is a string
            if (typeof addressValue === "string") {
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
    const age = calculateAge(patientData.birth_date);
    const birthDateFormatted = formatDate(patientData.birth_date);
    const genderFormatted = formatGender(patientData.gender);

    return (
        <ScrollView style={[styles.scrollView, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
                {/* Basic Information */}

                {/* Personal Details */}
                {/* {(genderFormatted || birthDateFormatted || age !== null) && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.section}>
                            {genderFormatted && <InfoRow label="Gender" value={genderFormatted} />}
                            {birthDateFormatted && <InfoRow label="Birth Date" value={birthDateFormatted} />}
                            {age !== null && <InfoRow label="Age" value={`${age} years old`} />}
                        </View>
                    </View>
                )} */}

                {/* Phone Numbers */}
                {patientData.numbers && patientData.numbers.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.phoneNumbersContainer}>
                            {patientData.numbers.map((number, index) => {
                                const phoneNumber = typeof number === "string" ? number : number.value;
                                const phoneType = typeof number === "object" ? number.type : "phone";
                                if (!phoneNumber) return null;
                                return (
                                    <View key={index} style={styles.phoneRow} className={`${index < patientData.numbers.length - 1 ? "border-b border-border" : ""}`}>
                                        <View style={styles.phoneInfo}>
                                            <BaseText type="Subhead" color="labels.secondary">
                                                {phoneType.charAt(0).toUpperCase() + phoneType.slice(1)}
                                            </BaseText>
                                            <BaseText type="Subhead" color="labels.primary">
                                                {phoneNumber}
                                            </BaseText>
                                        </View>
                                        <View style={styles.actionButtonsContainer}>
                                            <TouchableOpacity onPress={() => handleCall(phoneNumber)} style={styles.actionButton}>
                                                <IconSymbol name="phone.fill" size={16} color={colors.system.blue} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleMessage(phoneNumber)} style={styles.actionButton}>
                                                <IconSymbol name="message.fill" size={16} color={colors.system.blue} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Email */}
                {/* {patientData.email && patientData.email.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.section}>{patientData.email.map((email, index) => email && <InfoRow key={index} label={index === 0 ? "Email" : ""} value={email} />)}</View>
                    </View>
                )} */}

                {/* Addresses */}
                <View style={styles.sectionContainer}>
                    <InfoRow label="Gender" value={genderFormatted || ""} isLast={false} />
                    <InfoRow label="Birth Date" value={`${birthDateFormatted} (${age} years old)` || ""} isLast={false} />
                    <InfoRow label="Age" value={``} />
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
                                const linkValue = typeof link === "string" ? link : (link as any).value || String(link);
                                const linkType = typeof link === "object" && (link as any).type ? (link as any).type : "link";
                                if (!linkValue) return null;
                                return <InfoRow key={index} label={linkType} value={linkValue} isLast={index === patientData.links.length - 1} />;
                            })}
                        </View>
                    </View>
                )}

                {/* Doctor */}
                {/* {patientData.doctor && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.section}>
                            <InfoRow label="Doctor" value={(patientData.doctor as any).full_name || `${patientData.doctor.first_name || ""} ${patientData.doctor.last_name || ""}`.trim()} />
                        </View>
                    </View>
                )} */}
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
