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
import { ActivitiesTab, OverviewTab, TeamTab } from "./_components";

export default function PracticeOverviewScreen() {
    const insets = useSafeAreaInsets();
    const { selectedPractice } = useProfileStore();
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
                                <Avatar size={54} rounded={8} name={selectedPractice?.name ?? ""} imageUrl={selectedPractice?.image?.url} />
                                <View className="flex-1">
                                    <BaseText type="Title3" weight="400" color="system.black">
                                        {selectedPractice?.name ?? ""}
                                    </BaseText>
                                    <BaseText type="Callout" weight="400" color="labels.secondary" className="capitalize">
                                        Practice
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
                                            {selectedPractice?.created_by?.first_name + " " + selectedPractice?.created_by?.last_name}
                                        </BaseText>
                                    </View>
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            subscription plan:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary" className="capitalize">
                                            {selectedPractice?.role ?? ""}
                                        </BaseText>
                                    </View>
                                </View>
                                <View className="gap-3 pl-4 border-l border-system-gray5 w-1/2">
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            date created:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary">
                                            {selectedPractice?.created_at ? formatDate(selectedPractice.created_at) : ""}
                                        </BaseText>
                                    </View>
                                    <View>
                                        <BaseText type="Subhead" weight="400" color="labels.secondary">
                                            total patient:{" "}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.primary">
                                            {selectedPractice?.patients_count ?? 0}
                                        </BaseText>
                                    </View>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            <View className="bg-white" style={{ borderBottomWidth: 0.33, borderBottomColor: "rgba(84,84,86,0.34)", zIndex: 100 }}>
                <View className="px-4">
                    <View className="flex-row relative h-[44px]">
                        {tabs.map((tab, i) => (
                            <TouchableOpacity key={tab} onPress={() => handleTabPress(i)} className="flex-1 items-center justify-center px-4 py-3">
                                <BaseText type="Subhead" weight={activeTab === i ? 600 : 400} color={activeTab === i ? "system.blue" : "labels.secondary"}>
                                    {tab}
                                </BaseText>
                            </TouchableOpacity>
                        ))}
                        <Animated.View
                            style={{
                                position: "absolute",
                                bottom: -0.33,
                                height: 4,
                                width: tabWidth,
                                backgroundColor: colors.system.blue,
                                transform: [{ translateX }],
                                borderTopLeftRadius: 6,
                                borderTopRightRadius: 6,
                            }}
                        />
                    </View>
                </View>
            </View>
            {activeTab === 0 && <OverviewTab />}
            {activeTab === 1 && <TeamTab practiceId={selectedPractice?.id} />}
            {activeTab === 2 && <ActivitiesTab practiceId={selectedPractice?.id} />}
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
