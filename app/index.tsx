import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "../utils/hook/useAuth";
import { useGetPracticeList } from "../utils/hook/usePractice";

export default function IndexRoute() {
    const { isAuthenticated, profile } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);

    // Not authenticated - go to welcome (but not if checking)
    if (isAuthenticated === false) {
        return <Redirect href="/welcome" />;
    }

    // If authenticated is null (still checking), redirect to patients
    // The splash has already handled all loading
    if (isAuthenticated === null) {
        return <Redirect href="/(tabs)/patients" />;
    }

    // Authenticated but no profile or incomplete profile
    if (!profile || !profile.first_name || !profile.last_name) {
        return <Redirect href="/(tabs)/patients" />;
    }

    // No practice or empty practice list
    if (!practiceList?.data || practiceList.data.length === 0) {
        return <Redirect href="/(tabs)/patients" />;
    }

    // Everything ready - go to main app
    return <Redirect href="/(tabs)/patients" />;
}
