import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors.shared";
import { useGetArchivedPatients, useGetPracticeMembers, useUnarchivePatient } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ArchiveScreen() {
    const insets = useSafeAreaInsets();
    const { selectedPractice } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);

    // Get current user's role in the selected practice
    const currentUserRole = useMemo(() => {
        if (!selectedPractice || !practiceMembers?.data || !profile?.email) {
            return selectedPractice?.role;
        }
        const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
        return currentMember?.role || selectedPractice.role;
    }, [selectedPractice, practiceMembers?.data, profile?.email]);

    // Determine doctor_id based on user role
    const doctorId = useMemo(() => {
        if (currentUserRole === "owner" || currentUserRole === "admin" || currentUserRole === "member") {
            return undefined;
        }
        if (currentUserRole === "doctor" && profile?.id) {
            return profile.id;
        }
        return undefined;
    }, [currentUserRole, profile?.id]);

    const { data: archivedPatients, isLoading, refetch: refetchArchivedPatients } = useGetArchivedPatients(selectedPractice?.id || 0, { doctor_id: doctorId });

    const unarchivePatientMutation = useUnarchivePatient(
        () => {
            refetchArchivedPatients();
            queryClient.invalidateQueries({ queryKey: ["GetPatients"] });
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to unarchive patient");
        },
    );

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ backgroundColor: "white" }}>
            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : archivedPatients?.data && archivedPatients.data.length > 0 ? (
                archivedPatients.data.map((item, index) => {
                    const isLastItem = index === archivedPatients.data.length - 1;
                    return (
                        <Host matchContents key={`archived-${item.id}-${index}`}>
                            <ContextMenu activationMethod="longPress" modifiers={[foregroundStyle("labels.primary")]}>
                                <ContextMenu.Items>
                                    <Button
                                        role="destructive"
                                        systemImage="arrow.uturn.backward"
                                        onPress={() => {
                                            Alert.alert("Unarchive Patient", `Are you sure you want to unarchive ${item.first_name} ${item.last_name}?`, [
                                                {
                                                    text: "Cancel",
                                                    style: "cancel",
                                                },
                                                {
                                                    text: "Unarchive",
                                                    style: "destructive",
                                                    onPress: () => {
                                                        unarchivePatientMutation.mutate(item.id);
                                                    },
                                                },
                                            ]);
                                        }}
                                    >
                                        Unarchive
                                    </Button>
                                </ContextMenu.Items>
                                <ContextMenu.Trigger>
                                    <TouchableOpacity onPress={() => router.push(`/patients/${item.id}`)} style={[styles.listItem, !isLastItem && styles.listItemBorder]} className={`flex-row items-center gap-3 px-4 py-2 bg-white ${!isLastItem ? "border-b border-gray-200" : ""}`}>
                                        <Avatar haveRing name={item.full_name} size={40} imageUrl={item.profile_image?.url || undefined} color={item.doctor?.color} />
                                        <BaseText type="Callout" weight={500} color="labels.primary">
                                            {item.full_name}
                                        </BaseText>
                                    </TouchableOpacity>
                                </ContextMenu.Trigger>
                            </ContextMenu>
                        </Host>
                    );
                })
            ) : (
                <View style={styles.centerContainer}>
                    <BaseText type="Title2" weight="600" color="labels.secondary">
                        No archived patients
                    </BaseText>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    listItem: {
        minHeight: 60,
    },
    listItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border || "#E5E5E7",
    },
});
