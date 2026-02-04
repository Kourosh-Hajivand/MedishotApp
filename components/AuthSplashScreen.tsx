import { useAuth } from "@/utils/hook/useAuth";
import { useGetPracticeList } from "@/utils/hook/usePractice";
import { loadProfileSelection } from "@/utils/hook/useProfileStore";
import { useEffect, useRef, useState } from "react";
import { AnimatedSplashScreen } from "./SplashScreen";

interface AuthSplashScreenProps {
    onAuthReady: () => void;
}

export function AuthSplashScreen({ onAuthReady }: AuthSplashScreenProps) {
    const [isAnimationReady, setIsAnimationReady] = useState(false);
    const [isDataReady, setIsDataReady] = useState(false);
    const hasLoadedPractice = useRef(false);

    const { isAuthenticated, profile, isProfileLoading, isLoading: isAuthLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);

    // Load default practice selection
    useEffect(() => {
        if (isAuthenticated === true && practiceList?.data && practiceList.data.length > 0 && !isPracticeListLoading && !hasLoadedPractice.current) {
            hasLoadedPractice.current = true;
            loadProfileSelection(practiceList.data).catch(console.error);
        }
    }, [isAuthenticated, practiceList, isPracticeListLoading]);

    // Wait for all data to be ready before hiding splash
    useEffect(() => {
        // Keep splash if still loading auth
        if (isAuthLoading || isAuthenticated === null) {
            setIsDataReady(false);
            return;
        }

        // If not authenticated, ready to show login
        if (isAuthenticated === false) {
            setIsDataReady(true);
            return;
        }

        // If authenticated, wait for all data
        if (isAuthenticated === true) {
            // Keep splash while loading profile
            if (isProfileLoading) {
                setIsDataReady(false);
                return;
            }

            // If profile failed to load, ready to show error/welcome
            if (!profile && !isProfileLoading) {
                setIsDataReady(true);
                return;
            }

            // If profile incomplete, ready to show complete profile flow
            if (profile && (!profile.first_name || !profile.last_name)) {
                setIsDataReady(true);
                return;
            }

            // Keep splash while loading practice list
            if (isPracticeListLoading) {
                setIsDataReady(false);
                return;
            }

            // If practice list loaded (or empty), ready to show app
            setIsDataReady(true);
        }
    }, [isAuthLoading, isAuthenticated, isProfileLoading, profile, isPracticeListLoading, practiceList]);

    // Hide splash when ready - with 2s minimum display time
    useEffect(() => {
        if (isAnimationReady && isDataReady) {
            const timer = setTimeout(() => {
                onAuthReady();
            }, 2200);
            return () => clearTimeout(timer);
        }
    }, [isAnimationReady, isDataReady, onAuthReady]);

    return <AnimatedSplashScreen onAnimationComplete={() => setIsAnimationReady(true)} />;
}
