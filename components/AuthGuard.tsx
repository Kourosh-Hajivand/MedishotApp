import { useAuth } from "@/utils/hook/useAuth";
import { useNetworkStatus } from "@/utils/hook/useNetworkStatus";
import { useGetPracticeList } from "@/utils/hook/usePractice";
import { router, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication.
 * Redirects to /welcome if user is not authenticated.
 * Redirects to /(auth)/completeProfile if profile is incomplete.
 * Redirects to /(auth)/select-role if user has no practice.
 * Only protects routes outside of (auth) and welcome screens.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isAuthenticated, profile, isProfileLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);
    const { isOffline } = useNetworkStatus();
    const segments = useSegments();

    // Routes that don't require authentication
    const publicRoutes = ["welcome", "(auth)", "error", "offline"];

    // Check if current route is public
    const isPublicRoute = React.useMemo(() => {
        return segments.some((segment) => publicRoutes.includes(segment));
    }, [segments]);

    // Check if current route is in auth flow (for profile completion or practice selection)
    const isInAuthFlow = React.useMemo(() => {
        return segments.some((segment) => segment === "(auth)");
    }, [segments]);

    useEffect(() => {
        // Check network status first - if offline, redirect to offline page
        if (isOffline && !isPublicRoute) {
            // Only redirect if not already on offline page
            const isOnOfflinePage = segments.some((segment) => segment === "offline");
            if (!isOnOfflinePage) {
                router.replace("/offline");
            }
            return;
        }

        // Only check authentication and practice for protected routes
        if (isPublicRoute || isInAuthFlow) {
            return;
        }

        // If authentication check is complete and user is not authenticated, redirect to welcome
        if (isAuthenticated === false) {
            router.replace("/welcome");
            return;
        }

        // If user is authenticated, check profile and practice
        if (isAuthenticated === true) {
            // Check if profile is complete (has first_name and last_name)
            if (profile && (!profile.first_name || !profile.last_name)) {
                router.replace("/(auth)/completeProfile");
                return;
            }

            // Check if practice list is loaded and empty
            if (!isPracticeListLoading && !isProfileLoading && profile) {
                if (!practiceList?.data || practiceList.data.length === 0) {
                    router.replace("/(auth)/select-role");
                    return;
                }
            }
        }
    }, [isAuthenticated, profile, practiceList, isPracticeListLoading, isProfileLoading, isPublicRoute, isInAuthFlow, isOffline, segments]);

    // If checking authentication, show loading
    if (isAuthenticated === null && !isPublicRoute && !isInAuthFlow) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    // If checking profile or practice list, show loading
    if (isAuthenticated === true && (isProfileLoading || isPracticeListLoading) && !isPublicRoute && !isInAuthFlow) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    // If not authenticated and not on public route, don't render children (redirect will happen)
    if (isAuthenticated === false && !isPublicRoute && !isInAuthFlow) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    // Render children for authenticated users with complete profile and practice, or public routes
    return <>{children}</>;
};
