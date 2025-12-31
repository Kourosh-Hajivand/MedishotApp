import { useGetPracticeMembers } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { View } from "react-native";

export default function AddPatientRedirect() {
    const { selectedPractice } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);

    // Get current user's role in the selected practice
    const currentUserRole = useMemo(() => {
        if (!selectedPractice || !practiceMembers?.data || !profile?.email) {
            return selectedPractice?.role; // Fallback to practice role
        }

        // Find current user in practice members by email
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

    // Count available doctors (including owner if they are the only option)
    const availableDoctors = useMemo(() => {
        const doctorMembers = practiceMembers?.data?.filter((member) => member.role === "doctor") ?? [];
        
        // If current user is owner, add them to the list
        if (currentUserRole === "owner" && currentUserMember) {
            const ownerAsDoctor = {
                ...currentUserMember,
                role: "doctor" as const,
            };
            const ownerExists = doctorMembers.some((doc) => doc.id === currentUserMember.id);
            if (!ownerExists) {
                return [ownerAsDoctor, ...doctorMembers];
            }
        }
        
        return doctorMembers;
    }, [practiceMembers?.data, currentUserRole, currentUserMember]);

    useFocusEffect(
        useCallback(() => {
            // If user is doctor, go directly to photo (no need to select doctor)
            if (currentUserRole === "doctor") {
                router.push("/(modals)/add-patient/photo");
            } else if (currentUserRole === "admin" || currentUserRole === "owner") {
                // If user is owner and only one doctor option exists (themselves), skip selection
                if (currentUserRole === "owner" && availableDoctors.length === 1 && currentUserMember) {
                    const ownerAsDoctor = {
                        ...currentUserMember,
                        role: "doctor" as const,
                    };
                    // Navigate directly to form with owner as doctor
                    router.push({
                        pathname: "/(modals)/add-patient/form",
                        params: {
                            doctor_id: typeof currentUserMember.id === "number" ? String(currentUserMember.id) : (typeof currentUserMember.id === "string" && currentUserMember.id.includes(":") ? currentUserMember.id.split(":")[1] : String(currentUserMember.id)),
                            doctor: JSON.stringify(ownerAsDoctor),
                        },
                    });
                } else {
                    // If user is staff (admin) or owner with multiple doctors, show doctor selection modal
                    router.push("/(modals)/add-patient/select-doctor");
                }
            } else {
                // Otherwise, go directly to add patient form
                router.push("/(modals)/add-patient/photo");
            }
        }, [currentUserRole, availableDoctors.length, currentUserMember]),
    );

    return <View style={{ flex: 1, backgroundColor: "white" }} />;
}
