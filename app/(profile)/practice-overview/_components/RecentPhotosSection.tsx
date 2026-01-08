import { BaseText } from "@/components";
import { useGetRecentlyPhotos } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Media } from "@/utils/service/models/ResponseModels";
import React from "react";
import { Image, ScrollView, View } from "react-native";

export function RecentPhotosSection() {
    const { selectedPractice } = useProfileStore();
    const { data: recentPhotos } = useGetRecentlyPhotos(selectedPractice?.id ?? 0, !!selectedPractice?.id);

    return (
        <View className="bg-white px-4 py-3 gap-3">
            <BaseText type="Title3" weight="600" color="labels.primary">
                Recent Photos
            </BaseText>
            <View className="flex-row items-end gap-1">
                <BaseText type="Title3" weight="600" color="labels.primary">
                    {recentPhotos?.data?.length ?? 0}
                </BaseText>
                <BaseText type="Callout" weight="400" color="labels.secondary">
                    Images Added Today
                </BaseText>
            </View>
            {recentPhotos?.data && recentPhotos.data.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                    {recentPhotos.data.slice(0, 5).map((photo: Media, index: number) => (
                        <View key={photo.id || index} className="gap-[10px]" style={{ width: 219 }}>
                            <View className="rounded-md overflow-hidden border border-system-gray6" style={{ width: 219, height: 219 }}>
                                <Image source={{ uri: photo.url }} className="w-full h-full" resizeMode="cover" />
                            </View>
                            <View>
                                <BaseText type="Subhead" weight="600" color="labels.primary">
                                    {photo.name || "Photo"}
                                </BaseText>
                                <BaseText type="Caption1" weight="400" color="labels.secondary">
                                    taken by {photo.model_type || "Staff"}
                                </BaseText>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View className="items-center justify-center py-8">
                    <BaseText type="Body" weight="400" color="labels.secondary">
                        No photos yet
                    </BaseText>
                </View>
            )}
        </View>
    );
}
