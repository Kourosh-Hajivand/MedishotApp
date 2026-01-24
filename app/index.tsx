import { Redirect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../utils/hook/useAuth";
import { useGetPracticeList } from "../utils/hook/usePractice";

const MAX_LOADING_TIME = 8000; // 8 ثانیه timeout برای initial loading
const MAX_PROFILE_LOADING_TIME = 6000; // 6 ثانیه timeout برای profile loading

export default function IndexRoute() {
    const { isAuthenticated, profile, isProfileLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);
    const [shouldRedirectToWelcome, setShouldRedirectToWelcome] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const profileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Timeout برای جلوگیری از ماندن در initial loading state
    useEffect(() => {
        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (isAuthenticated === null || isProfileLoading) {
            setShouldRedirectToWelcome(false);
            timeoutRef.current = setTimeout(() => {
                console.warn("Initial loading timeout - redirecting to welcome");
                setShouldRedirectToWelcome(true);
            }, MAX_LOADING_TIME);
        } else {
            // اگر loading تمام شد، timeout را clear کن
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isAuthenticated, isProfileLoading]);

    // Timeout برای profile loading (وقتی token وجود دارد اما profile لود نمی‌شود)
    useEffect(() => {
        // Clear previous timeout
        if (profileTimeoutRef.current) {
            clearTimeout(profileTimeoutRef.current);
            profileTimeoutRef.current = null;
        }

        if (isAuthenticated && !profile && !isProfileLoading) {
            profileTimeoutRef.current = setTimeout(() => {
                console.warn("Profile loading timeout - redirecting to welcome");
                setShouldRedirectToWelcome(true);
            }, MAX_PROFILE_LOADING_TIME);
        } else {
            // اگر profile لود شد یا loading تمام شد، timeout را clear کن
            if (profileTimeoutRef.current) {
                clearTimeout(profileTimeoutRef.current);
                profileTimeoutRef.current = null;
            }
        }

        return () => {
            if (profileTimeoutRef.current) {
                clearTimeout(profileTimeoutRef.current);
            }
        };
    }, [isAuthenticated, profile, isProfileLoading]);

    // اگر timeout شده، به welcome redirect کن
    if (shouldRedirectToWelcome) {
        return <Redirect href="/welcome" />;
    }

    // اگر در حال چک کردن authentication هستیم
    if (isAuthenticated === null || isProfileLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    // اگر کاربر لاگین نکرده
    if (!isAuthenticated) {
        return <Redirect href="/welcome" />;
    }

    // اگر کاربر لاگین کرده، چک می‌کنیم که profile کامل است یا نه
    if (profile) {
        // مرحله ۱: پروفایل ناقص → خانه (tabs) باز می‌شود، مودال completeProfile روی آن push می‌شود
        if (!profile.first_name || !profile.last_name) {
            return <Redirect href="/(tabs)/patients" />;
        }

        // مرحله ۲: چک کردن practice list
        if (isPracticeListLoading) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            );
        }

        // اگر practice list خالی است یا وجود ندارد → خانه (tabs) باز می‌شود، مودال پرکتیس روی آن push می‌شود
        if (!practiceList?.data || practiceList.data.length === 0) {
            return <Redirect href="/(tabs)/patients" />;
        }

        // اگر همه چیز کامل است، به صفحه اصلی برو
        return <Redirect href="/(tabs)/patients" />;
    }

    // اگر profile هنوز لود نشده (اما token وجود دارد)
    // این حالت ممکن است زمانی اتفاق بیفتد که API call fail شود
    // اگر loading تمام شده اما profile وجود ندارد، به welcome redirect کن
    if (!isProfileLoading && !profile) {
        // اگر timeout نشده، یک بار دیگر چک کن
        // در غیر این صورت به welcome redirect می‌شود
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    // Fallback: اگر به اینجا رسیدیم، loading نشان بده
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );
}
