import { BaseText } from "@/components";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OverviewStatisticsSection() {
    const { selectedPractice } = useProfileStore();
    const { bottom } = useSafeAreaInsets();

    return (
        <View style={{ paddingBottom: bottom }} className="bg-white px-4 py-3 gap-4">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Overview
            </BaseText>
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Total Image Taken
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        {selectedPractice?.taken_images_count ?? 0}
                    </BaseText>
                </View>
                <View style={{ width: 0.33, height: 62, backgroundColor: "#c6c6c8" }} />
                <View className="flex-1 pl-4">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Total Consent Signed
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        {selectedPractice?.consents_count ?? 0}
                    </BaseText>
                </View>
            </View>
            <View style={{ width: "100%", height: 0.33, backgroundColor: "#c6c6c8" }} />
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Total Ai Enhancment
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        0 Images
                    </BaseText>
                </View>
                <View style={{ width: 0.33, height: 62, backgroundColor: "#c6c6c8" }} />
                <View className="flex-1 pl-4">
                    <BaseText type="Subhead" weight="400" color="labels.secondary">
                        Team members
                    </BaseText>
                    <BaseText type="Title2" weight="700" color="labels.primary">
                        {selectedPractice?.members_count ?? 0}
                    </BaseText>
                </View>
            </View>
        </View>
    );
}
