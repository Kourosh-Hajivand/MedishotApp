import { useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";

export default function AddPatientRedirect() {
    const { selectedPractice } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceMembers, error: practiceMembersError, isError: isPracticeMembersError } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const hasNavigatedRef = useRef(false);

    // Get current user's role in the selected practice
    const currentUserRole = useMemo(() => {
        if (!selectedPractice || !practiceMembers?.data || !profile?.email) {
            return selectedPractice?.role; // Fallback to practice role
        }

        // Find current user in practice members by email
        const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
        return currentMember?.role || selectedPractice.role;
    }, [selectedPractice, practiceMembers?.data, profile?.email]);

    // Get available doctors (members with role "doctor" or "owner")
    const availableDoctors = useMemo(() => {
        if (!practiceMembers?.data?.length) return [];
        return practiceMembers.data.filter((member) => member.role === "doctor" || member.role === "owner");
    }, [practiceMembers?.data]);

    // Navigate to patients tab first, then open modal
    useEffect(() => {
        // Don't navigate if there's an error
        if (isPracticeMembersError) {
            router.replace("/(tabs)/patients");
            return;
        }

        if (currentUserRole && availableDoctors && !hasNavigatedRef.current) {
            // First navigate to patients tab
            router.replace("/(tabs)/patients");
            hasNavigatedRef.current = true;

            // Then open modal based on user role
            const navigateToModal = () => {
                // If user is doctor, go directly to photo (no need to select doctor)
                if (currentUserRole === "doctor") {
                    router.push("/(modals)/add-patient/form");
                } else if (currentUserRole === "staff" || currentUserRole === "owner") {
                    // If there's only one doctor, go directly to photo with that doctor
                    if (availableDoctors.length === 1) {
                        const singleDoctor = availableDoctors[0];
                        const doctorIdParam = typeof singleDoctor.id === "number" ? String(singleDoctor.id) : singleDoctor.id.includes(":") ? singleDoctor.id.split(":")[1] : singleDoctor.id;
                        router.push({
                            pathname: "/(modals)/add-patient/form",
                            params: {
                                doctor_id: doctorIdParam,
                                doctor: JSON.stringify(singleDoctor),
                            },
                        });
                    } else {
                        // If user is staff (admin) or owner with multiple doctors, show doctor selection modal
                        router.push("/(modals)/add-patient/select-doctor");
                    }
                } else {
                    // Otherwise, go directly to add patient photo
                    router.push("/(modals)/add-patient/form");
                }
            };

            // Use requestAnimationFrame to ensure navigation completes before opening modal
            requestAnimationFrame(() => {
                requestAnimationFrame(navigateToModal);
            });
        }
    }, [currentUserRole, availableDoctors]);

    // Reset navigation flag when screen loses focus
    useFocusEffect(
        useCallback(() => {
            return () => {
                hasNavigatedRef.current = false;
            };
        }, []),
    );

    return <View style={{ flex: 1, backgroundColor: "white" }} />;
}
