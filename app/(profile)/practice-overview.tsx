import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import { colors } from "@/theme/colors";
import { formatDate } from "@/utils/helper/dateUtils";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import React, { useRef, useState } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PracticeOverviewScreen() {
    const insets = useSafeAreaInsets();
    const { settingView } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);
    const tabs = ["Overview", "Team", "Activities"];
    const screenWidth = Dimensions.get("window").width;
    const tabWidth = (screenWidth - 32) / tabs.length;
    const translateX = useRef(new Animated.Value(0)).current;
    const [activeTab, setActiveTab] = useState(0);

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        Animated.spring(translateX, { toValue: index * tabWidth, useNativeDriver: true, speed: 20 }).start();
    };
    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View className="px-4">
                <View className={`w-full bg-system-gray6 rounded-[12px] overflow-hidden`}>
                    <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7} className="flex items-center justify-between ">
                        <View className="flex-row items-center justify-between p-2 pr-4">
                            <View className="flex-row items-center gap-2 flex-1">
                                <Avatar size={54} rounded={settingView.type === "profile" ? 99 : 8} name={profile?.first_name ?? ""} />
                                <View className="flex-1">
                                    <BaseText type="Title3" weight="400" color="system.black">
                                        {settingView.type === "profile" ? profile?.first_name + " " + profile?.last_name : settingView.type === "practice" ? settingView.practice?.name : ""}
                                    </BaseText>
                                    <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                        {settingView.type}
                                    </BaseText>
                                </View>
                            </View>
                            <View className="ml-2">
                                <IconSymbol name={isExpanded ? "chevron.up" : "chevron.down"} size={14} color={colors.labels.secondary} />
                            </View>
                        </View>
                        {isExpanded && (
                            <View className="w-full flex-row items-start justify-between py-4 px-4 border-t border-system-gray5">
                                <View className="gap-3 w-1/2 pr-3">
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            owner:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary" className="capitalize">
                                            {settingView.type === "practice" ? settingView.practice?.created_by?.first_name + " " + settingView.practice?.created_by?.last_name : ""}
                                        </BaseText>
                                    </View>
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            subscription plan:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary" className="capitalize">
                                            {settingView.type === "practice" ? settingView.practice?.role : ""}
                                        </BaseText>
                                    </View>
                                </View>
                                <View className="gap-3 pl-4 border-l border-system-gray5 w-1/2">
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            date created:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary">
                                            {settingView.type === "practice" && settingView.practice?.created_at ? formatDate(settingView.practice.created_at) : ""}
                                        </BaseText>
                                    </View>
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            total patient:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary">
                                            {settingView.type === "practice" ? (settingView.practice?.patients_count ?? 0) : ""}
                                        </BaseText>
                                    </View>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            <View className="bg-white border-t  border-t-white" style={{ borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 100 }}>
                <View className="px-5">
                    <View className="flex-row relative">
                        {tabs.map((tab, i) => (
                            <TouchableOpacity key={tab} onPress={() => handleTabPress(i)} className="flex-1 items-center justify-center py-3">
                                <BaseText type="Subhead" weight={activeTab === i ? 600 : 400} color={activeTab === i ? "system.blue" : "labels.secondary"}>
                                    {tab}
                                </BaseText>
                            </TouchableOpacity>
                        ))}
                        <Animated.View
                            style={{
                                position: "absolute",
                                bottom: 0,
                                height: 3,
                                width: tabWidth,
                                backgroundColor: colors.system.blue,
                                transform: [{ translateX }],
                                borderTopLeftRadius: 3,
                                borderTopRightRadius: 3,
                            }}
                        />
                    </View>
                </View>
            </View>
            <View className="gap-6 p-4">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    Overview
                </BaseText>
                <View className="flex-row items-center justify-between">
                    <View className="w-1/2">
                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                            Total Image Taken
                        </BaseText>
                        <BaseText type="Title2" weight="600" color="labels.primary">
                            100
                        </BaseText>
                    </View>
                    <View className="border-l border-system-gray5 pl-4 w-1/2">
                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                            Total Consent Signed{" "}
                        </BaseText>
                        <BaseText type="Title2" weight="600" color="labels.primary">
                            30
                        </BaseText>
                    </View>
                </View>
                <View className="flex-row items-center justify-between border-t border-system-gray5 pt-4">
                    <View className="w-1/2">
                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                            Total Ai Enhancment
                        </BaseText>
                        <BaseText type="Title2" weight="600" color="labels.primary">
                            20
                        </BaseText>
                    </View>
                    <View className="border-l border-system-gray5 pl-4 w-1/2">
                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                            Team members
                        </BaseText>
                        <BaseText type="Title2" weight="600" color="labels.primary">
                            4
                        </BaseText>
                    </View>
                </View>
            </View>

            {/* TODO: Add practice overview content */}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        // paddingHorizontal: 20,
        gap: 16,
        paddingBottom: 20,
    },
    description: {
        marginTop: 8,
    },
});
