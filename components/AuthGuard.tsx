import { useAuth } from "@/utils/hook/useAuth";
import { useNetworkStatus } from "@/utils/hook/useNetworkStatus";
import { useGetPracticeList } from "@/utils/hook/usePractice";
import { router, useSegments } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

const LOG_TAG = "[AuthGuard]";

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
    const wasInAuthRef = useRef(false);
    const skipRedirectUntilRef = useRef<number>(0);

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

    const isInTabs = React.useMemo(() => {
        return segments.some((segment) => segment === "(tabs)");
    }, [segments]);

    const isInModals = React.useMemo(() => {
        return segments.some((segment) => segment === "(modals)");
    }, [segments]);

    const skipProfileOrPracticeRedirect = isInTabs || isInModals;

    // Track (auth) -> (modals) transition: when user opens select-date/select-gender from completeProfile,
    // we briefly leave (auth) before (modals) mounts. Avoid redirecting during that gap.
    const justLeftAuthForModals = (() => {
        const now = Date.now();
        if (skipRedirectUntilRef.current > now) return true;
        const wasAuth = wasInAuthRef.current;
        wasInAuthRef.current = isInAuthFlow;
        if (wasAuth && !isInAuthFlow && !isInModals && isInTabs) {
            skipRedirectUntilRef.current = now + 1200;
            if (__DEV__) console.warn(LOG_TAG, "transition (auth)->(modals) detected, skip redirect 1.2s");
            return true;
        }
        return false;
    })();

    const effectiveSkipRedirect = skipProfileOrPracticeRedirect || justLeftAuthForModals;

    useEffect(() => {
        if (__DEV__) {
            console.log(LOG_TAG, "segments", JSON.stringify(segments), "| public", isPublicRoute, "| auth", isInAuthFlow, "| tabs", isInTabs, "| modals", isInModals, "| skip", effectiveSkipRedirect);
        }

        // Only check authentication and practice for protected routes
        if (isPublicRoute || isInAuthFlow) {
            return;
        }

        // Never redirect when (modals) is open (e.g. select-gender, select-date). Keep them open.
        if (isInModals) {
            return;
        }

        // If authentication check is complete and user is not authenticated, redirect to welcome
        if (isAuthenticated === false) {
            if (__DEV__) console.warn(LOG_TAG, "redirect -> /welcome (not authenticated)");
            router.replace("/welcome");
            return;
        }

        // If user is authenticated, check profile and practice
        if (isAuthenticated === true) {
            // Profile incomplete: redirect EXCEPT when on (tabs), (modals), or (auth)->(modals) transition.
            if (profile && (!profile.first_name || !profile.last_name) && !effectiveSkipRedirect) {
                if (__DEV__) console.warn(LOG_TAG, "redirect -> completeProfile (profile incomplete)");
                router.replace("/(auth)/completeProfile");
                return;
            }

            // If practice list is loaded and empty: redirect EXCEPT when on (tabs) or (modals).
            if (!isPracticeListLoading && !isProfileLoading && profile) {
                if ((!practiceList?.data || practiceList.data.length === 0) && !effectiveSkipRedirect) {
                    if (__DEV__) console.warn(LOG_TAG, "redirect -> select-role (no practice)");
                    router.replace("/(auth)/select-role");
                    return;
                }
            }
        }
    }, [isAuthenticated, profile, practiceList, isPracticeListLoading, isProfileLoading, isPublicRoute, isInAuthFlow, effectiveSkipRedirect, segments]);

    // If on (modals) (e.g. select-gender, select-date), always render children — never replace with loading/redirect.
    if (isInModals) {
        return <>{children}</>;
    }

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
