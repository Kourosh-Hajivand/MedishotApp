import { BaseText } from "@/components";
import { ErrorState } from "@/components/ErrorState";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors.shared";
import { useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Member } from "@/utils/service/models/ResponseModels";
import { useHeaderHeight } from "@react-navigation/elements";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SelectDoctorScreen() {
    const { selectedPractice } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceMembers, isLoading, error, refetch } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();

    // Get current user's role in the selected practice
    const currentUserRole = useMemo(() => {
        if (!selectedPractice || !practiceMembers?.data || !profile?.email) {
            return selectedPractice?.role;
        }
        const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
        return currentMember?.role || selectedPractice.role;
    }, [selectedPractice, practiceMembers?.data, profile?.email]);

    // Get current user as member
    const currentUserMember = useMemo(() => {
        if (!practiceMembers?.data || !profile?.email) {
            return null;
        }
        return practiceMembers.data.find((member) => member.email === profile.email) || null;
    }, [practiceMembers?.data, profile?.email]);

    // Filter doctors and add owner if current user is owner
    const doctors = useMemo(() => {
        const doctorMembers = practiceMembers?.data?.filter((member) => member.role === "doctor") ?? [];

        // If current user is owner, add them to the list as a doctor
        if (currentUserRole === "owner" && currentUserMember && profile) {
            const ownerAsDoctor: Member = {
                ...currentUserMember,
                role: "doctor", // Treat owner as doctor for this list
            };
            // Check if owner is already in the list
            const ownerExists = doctorMembers.some((doc) => doc.id === currentUserMember.id);
            if (!ownerExists) {
                return [ownerAsDoctor, ...doctorMembers];
            }
        }

        return doctorMembers;
    }, [practiceMembers?.data, currentUserRole, currentUserMember, profile]);

    // Auto-select if no doctors available and user is owner
    useEffect(() => {
        if (!isLoading && doctors.length === 0 && currentUserRole === "owner" && currentUserMember && profile) {
            // Auto-select owner as doctor
            const ownerAsDoctor: Member = {
                ...currentUserMember,
                role: "doctor",
            };
            handleSelectDoctor(ownerAsDoctor);
        }
    }, [isLoading, doctors.length, currentUserRole, currentUserMember, profile]);

    const handleSelectDoctor = useCallback((doctor: Member | string | number) => {
        // If doctor is a Member object, extract ID and pass full object
        let numericId: string;
        let doctorObject: Member | null = null;

        if (typeof doctor === "object" && "id" in doctor) {
            // It's a Member object
            doctorObject = doctor;
            if (typeof doctor.id === "number") {
                numericId = String(doctor.id);
            } else if (typeof doctor.id === "string" && doctor.id.includes(":")) {
                numericId = doctor.id.split(":")[1];
            } else {
                numericId = String(doctor.id);
            }
        } else {
            // It's just an ID (backward compatibility)
            if (typeof doctor === "number") {
                numericId = String(doctor);
            } else if (typeof doctor === "string" && doctor.includes(":")) {
                numericId = doctor.split(":")[1];
            } else {
                numericId = String(doctor);
            }
        }

        // Navigate to add-patient form with doctor_id and full doctor object
        router.push({
            pathname: "/(modals)/add-patient/form",
            params: {
                doctor_id: numericId,
                ...(doctorObject && { doctor: JSON.stringify(doctorObject) }),
            },
        });
    }, []);

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const renderDoctorItem = useCallback(
        ({ item }: { item: Member }) => {
            const doctorName = item.first_name && item.last_name ? `Dr. ${item.first_name} ${item.last_name}` : item.email;

            return (
                <TouchableOpacity onPress={() => handleSelectDoctor(item)} className="bg-white p-3 rounded-xl">
                    <View style={styles.doctorRow}>
                        <Avatar haveRing name={doctorName} size={36} color={item.color} imageUrl={item.image?.url} />
                        <View style={styles.nameContainer}>
                            <BaseText type="Callout" weight={600} color="labels.primary">
                                {doctorName}
                            </BaseText>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        },
        [handleSelectDoctor],
    );

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
                <ErrorState message={error?.message || "Failed to load practice members"} onRetry={() => refetch()} />
            </View>
        );
    }

    if (doctors.length === 0) {
        return (
            <View className="flex-1" style={{ backgroundColor: colors.system.gray6, paddingTop: headerHeight }}>
                <View className="flex-1 items-center justify-center px-6">
                    <IconSymbol name="person.2" color={colors.labels.tertiary} size={64} />
                    <BaseText type="Body" color="labels.secondary" className="mt-4 text-center">
                        No doctors available in this practice
                    </BaseText>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.system.gray6 }}>
            <FlatList
                data={doctors}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{
                    paddingTop: headerHeight + spacing["4"],
                    paddingBottom: insets.bottom + spacing["4"],
                    paddingHorizontal: spacing["4"],
                    gap: spacing["2.5"],
                }}
                renderItem={renderDoctorItem}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    doctorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["2.5"],
    },
    avatarContainer: {
        width: 41,
        height: 41,
        borderRadius: 9999,
        borderWidth: 1.786,
        padding: 2.645,
        justifyContent: "center",
        alignItems: "center",
    },
    nameContainer: {
        flex: 1,
        justifyContent: "center",
    },
});
