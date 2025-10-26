import colors from "@/theme/colors";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import React from "react";
import { Platform } from "react-native";
export default function TabsLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="patients">
                <Label>Patients</Label>
                <Icon sf="list.bullet" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="album">
                <Label>Album</Label>
                <Icon sf="photo.stack" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger options={{ selectedIconColor: colors.system.blue, iconColor: colors.labels.primary, indicatorColor: colors.system.blue }} name="add-patient" role="search">
                {Platform.select({
                    ios: <Icon sf="plus.circle.fill" selectedColor={colors.system.blue} drawable="custom_android_drawable" />,
                    android: <Icon sf="plus.circle.fill" drawable="custom_android_drawable" />,
                })}
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
