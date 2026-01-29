import { getPatientLimitFromPlan } from "@/utils/helper/subscriptionLimits";
import { useGetPatients, useGetPracticeMembers, useGetSubscriptionStatus } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, View } from "react-native";

export default function AddPatientRedirect() {
    const isFocused = useIsFocused();
    const { selectedPractice } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceMembers, isError: isPracticeMembersError } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const { data: subscriptionData, isLoading: isSubscriptionLoading } = useGetSubscriptionStatus(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const needFallbackCount = !!subscriptionData && subscriptionData?.data?.limits?.current_patient_count === undefined;
    const { data: patientsData, isLoading: isPatientsLoading } = useGetPatients(selectedPractice?.id);
    const hasNavigatedRef = useRef(false);

    const limits = subscriptionData?.data?.limits;
    const patientLimit = useMemo(() => getPatientLimitFromPlan(subscriptionData), [subscriptionData]);
    const currentPatientCount = typeof limits?.current_patient_count === "number" ? limits.current_patient_count : needFallbackCount ? (patientsData?.data?.length ?? 0) : 0;
    const remainingPatientSlots = typeof limits?.remaining_patient_slots === "number" ? limits.remaining_patient_slots : patientLimit != null ? Math.max(0, patientLimit - currentPatientCount) : null;
    const isPatientLimitReached = patientLimit != null && ((remainingPatientSlots !== null && remainingPatientSlots === 0) || (remainingPatientSlots == null && currentPatientCount >= patientLimit));

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

    const navigateToModal = useCallback(() => {
        if (!currentUserRole || !availableDoctors) return;
        if (currentUserRole === "doctor") {
            router.push("/(modals)/add-patient/form");
        } else if (currentUserRole === "staff" || currentUserRole === "owner") {
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
                router.push("/(modals)/add-patient/select-doctor");
            }
        } else {
            router.push("/(modals)/add-patient/form");
        }
    }, [currentUserRole, availableDoctors]);

    // When tab is focused and data is ready, either open add-patient modal or redirect to patients (limit/error)
    useEffect(() => {
        if (!isFocused || hasNavigatedRef.current) return;
        if (isPracticeMembersError) {
            router.replace("/(tabs)/patients");
            return;
        }
        if (!currentUserRole || !availableDoctors) return;
        if (isSubscriptionLoading) return;
        if (needFallbackCount && isPatientsLoading) return;

        hasNavigatedRef.current = true;

        if (isPatientLimitReached) {
            router.replace("/(tabs)/patients");
            setTimeout(() => {
                Alert.alert("Plan Limit Reached", "You have reached the maximum number of patients allowed in your current plan. Please upgrade your plan to add more patients.", [
                    { text: "Cancel", style: "cancel", onPress: () => router.back() },
                    { text: "Upgrade Plan", onPress: () => router.push("/(profile)/subscription") },
                ]);
            }, 400);
        } else {
            navigateToModal();
        }
    }, [isFocused, isPracticeMembersError, currentUserRole, availableDoctors, isSubscriptionLoading, needFallbackCount, isPatientsLoading, isPatientLimitReached, navigateToModal]);

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
