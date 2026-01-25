import { ErrorState } from "@/components/ErrorState";
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
    const { data: practiceList, isLoading: isPracticeListLoading, error: practiceListError, refetch: refetchPracticeList } = useGetPracticeList(isAuthenticated === true);
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

    const isOnWelcome = React.useMemo(() => segments.some((s) => s === "welcome"), [segments]);
    const isOnLogin = React.useMemo(() => segments.some((s) => s === "login"), [segments]);
    const isOnSignup = React.useMemo(() => segments.some((s) => s === "signup"), [segments]);

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

        // Never redirect when (modals) is open (e.g. select-gender, select-date). Keep them open.
        if (isInModals) {
            return;
        }

        // 1. اگر authenticated است و همه چیز کامل است → به tabs redirect کن (حتی اگر در auth باشد)
        if (isAuthenticated === true && profile && profile.first_name && profile.last_name) {
            if (!isPracticeListLoading && !isProfileLoading) {
                if (practiceList?.data && practiceList.data.length > 0) {
                    // همه چیز کامل است → به tabs redirect کن
                    if (isInAuthFlow) {
                        if (__DEV__) console.warn(LOG_TAG, "redirect -> /(tabs)/patients (authenticated with complete profile and practice, leaving auth)");
                        router.replace("/(tabs)/patients");
                        return;
                    }
                }
            }
        }

        // 2. اگر authenticated است اما در welcome/login/signup است → به tabs redirect کن
        if (isAuthenticated === true && (isOnWelcome || isOnLogin || isOnSignup)) {
            if (__DEV__) console.warn(LOG_TAG, "redirect -> /(tabs)/patients (authenticated on welcome/login/signup)");
            router.replace("/(tabs)/patients");
            return;
        }

        // 3. اگر authenticated نیست و در auth نیست → به welcome redirect کن
        if (isAuthenticated === false && !isInAuthFlow && !isPublicRoute) {
            if (__DEV__) console.warn(LOG_TAG, "redirect -> /welcome (not authenticated)");
            router.replace("/welcome");
            return;
        }

        // 4. برای protected routes (غیر از auth و public)
        if (isPublicRoute || isInAuthFlow) {
            // در auth flow، فقط چک می‌کنیم که آیا باید redirect شود (بالا انجام شد)
            return;
        }

        // 5. برای protected routes: چک profile و practice
        // IMPORTANT: When in (tabs)/patients, let patients/_layout.tsx handle modal navigation
        // Don't redirect here - it causes navigation conflicts
        if (isAuthenticated === true && !isInTabs) {
            // Profile incomplete: redirect EXCEPT when on (tabs), (modals), or (auth)->(modals) transition.
            if (profile && (!profile.first_name || !profile.last_name) && !effectiveSkipRedirect) {
                if (__DEV__) console.warn(LOG_TAG, "redirect -> completeProfile (profile incomplete)");
                router.replace("/(auth)/completeProfile");
                return;
            }

            // Practice list empty: redirect EXCEPT when on (tabs) or (modals).
            // When in tabs, patients/_layout.tsx will handle opening the modal
            if (!isPracticeListLoading && !isProfileLoading && profile) {
                if ((!practiceList?.data || practiceList.data.length === 0) && !effectiveSkipRedirect) {
                    if (__DEV__) console.warn(LOG_TAG, "redirect -> select-role (no practice)");
                    router.replace("/(auth)/select-role");
                    return;
                }
            }
        }
    }, [isAuthenticated, profile, practiceList, isPracticeListLoading, isProfileLoading, isPublicRoute, isInAuthFlow, effectiveSkipRedirect, segments, isOnWelcome, isOnLogin, isOnSignup, isInModals, isInTabs]);

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

    // If there's an error loading practice list, show error state
    // BUT: Don't show error in tabs - let patients/_layout.tsx handle it
    // This allows modals to still open from tabs even if practice list has error
    if (isAuthenticated === true && practiceListError && !isPublicRoute && !isInAuthFlow && !isPracticeListLoading && !isInTabs) {
        const errorMessage = practiceListError instanceof Error ? practiceListError.message : "Failed to load practices. Please try again.";
        return (
            <ErrorState
                title="خطا در بارگذاری Practice List"
                message={errorMessage}
                onRetry={() => {
                    refetchPracticeList();
                }}
            />
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
