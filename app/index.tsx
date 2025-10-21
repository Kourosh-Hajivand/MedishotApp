import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../utils/hook/useAuth";
import { useGetPracticeList } from "../utils/hook/usePractice";

export default function IndexRoute() {
    const { isAuthenticated, profile, isProfileLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(isAuthenticated === true);

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
        // مرحله ۱: چک کردن نام و فامیل
        if (!profile.first_name || !profile.last_name) {
            return <Redirect href="/(auth)/completeProfile" />;
        }

        // مرحله ۲: چک کردن practice list
        if (isPracticeListLoading) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            );
        }

        // اگر practice list خالی است یا وجود ندارد
        if (!practiceList?.data || practiceList.data.length === 0) {
            return <Redirect href="/(auth)/select-role" />;
        }

        // اگر همه چیز کامل است، به صفحه اصلی برو
        return <Redirect href="/(tabs)/patients" />;
    }

    // اگر profile هنوز لود نشده
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );
}
