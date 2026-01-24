import colors from "@/theme/colors";
import { useAuth } from "@/utils/hook/useAuth";
import { useGetPracticeList } from "@/utils/hook";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Platform } from "react-native";

export default function TabsLayout() {
    const { profile, isProfileLoading } = useAuth();
    const { data: practiceList, isLoading: isPracticeListLoading } = useGetPracticeList(profile != null && !!profile.first_name && !!profile.last_name);
    const hasIncompleteProfile = !!profile && (!profile.first_name || !profile.last_name) && !isProfileLoading;
    const hasNoPractice = !practiceList?.data?.length && !isPracticeListLoading;
    const hideTabs = hasIncompleteProfile || hasNoPractice;

    return (
        <NativeTabs>
            <NativeTabs.Trigger name="patients">
                <Label>Patients</Label>
                <Icon sf="list.bullet" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="album" hidden={hideTabs}>
                <Label>Album</Label>
                <Icon sf="photo.stack" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
                name="add-patient"
                role="search"
                hidden={hideTabs}
                options={{ selectedIconColor: colors.system.blue, iconColor: colors.labels.primary, indicatorColor: colors.system.blue }}
            >
                {Platform.select({
                    ios: <Icon sf="plus.circle.fill" selectedColor={colors.system.blue} drawable="custom_android_drawable" />,
                    android: <Icon sf="plus.circle.fill" drawable="custom_android_drawable" />,
                })}
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
