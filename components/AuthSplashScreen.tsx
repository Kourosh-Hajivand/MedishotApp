import { useAuth } from "@/utils/hook/useAuth";
import { useGetPracticeList } from "@/utils/hook/usePractice";
import { loadProfileSelection } from "@/utils/hook/useProfileStore";
import { useEffect, useState } from "react";
import { AnimatedSplashScreen } from "./SplashScreen";

interface AuthSplashScreenProps {
    onAuthReady: () => void;
}

export function AuthSplashScreen({ onAuthReady }: AuthSplashScreenProps) {
    const [isAnimationReady, setIsAnimationReady] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // استفاده از useAuth و useGetPracticeList برای چک کردن وضعیت authentication
    const { isAuthenticated, profile, isProfileLoading, isLoading: isAuthLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);

    // مدیریت انتخاب practice پیش‌فرض
    useEffect(() => {
        if (isAuthenticated === true && practiceList?.data && practiceList.data.length > 0 && !isPracticeListLoading) {
            // اگر practice list لود شد، default practice را انتخاب کن
            loadProfileSelection(practiceList.data).catch(console.error);
        }
    }, [isAuthenticated, practiceList, isPracticeListLoading]);

    // تعیین زمان مخفی شدن splash screen
    useEffect(() => {
        // اگر هنوز در حال چک کردن authentication هستیم، splash را نگه دار
        if (isAuthLoading || isAuthenticated === null) {
            setIsAuthReady(false);
            return;
        }

        // اگر کاربر لاگین نکرده، splash را مخفی کن
        if (isAuthenticated === false) {
            setIsAuthReady(true);
            return;
        }

        // اگر کاربر لاگین کرده
        if (isAuthenticated === true) {
            // اگر profile در حال لود است، splash را نگه دار
            if (isProfileLoading) {
                setIsAuthReady(false);
                return;
            }

            // اگر profile لود نشده و error داریم (مثلاً 401)، splash را مخفی کن
            if (!profile && !isProfileLoading) {
                setIsAuthReady(true);
                return;
            }

            // اگر profile کامل نیست (نام و فامیل ندارد)، splash را مخفی کن
            if (profile && (!profile.first_name || !profile.last_name)) {
                setIsAuthReady(true);
                return;
            }

            // اگر practice list در حال لود است، splash را نگه دار
            if (isPracticeListLoading) {
                setIsAuthReady(false);
                return;
            }

            // اگر practice list خالی است، splash را مخفی کن
            if (!practiceList?.data || practiceList.data.length === 0) {
                setIsAuthReady(true);
                return;
            }

            // اگر همه چیز آماده است، splash را مخفی کن
            setIsAuthReady(true);
        }
    }, [isAuthLoading, isAuthenticated, isProfileLoading, profile, isPracticeListLoading, practiceList]);

    // وقتی هم animation و هم auth ready شد، به parent اطلاع بده
    useEffect(() => {
        if (isAnimationReady && isAuthReady) {
            onAuthReady();
        }
    }, [isAnimationReady, isAuthReady, onAuthReady]);

    return <AnimatedSplashScreen onAnimationComplete={() => setIsAnimationReady(true)} />;
}
