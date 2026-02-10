import { BaseText } from "@/components";
import { ImageViewerModal } from "@/components/Image/ImageViewerModal";
import { ImageSkeleton, Skeleton } from "@/components/skeleton";
import { useAuth } from "@/utils/hook/useAuth";
import { useGetRecentlyPhotos } from "@/utils/hook/usePractice";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { PatientMedia } from "@/utils/service/models/ResponseModels";
import PatientService from "@/utils/service/PatientService";
import { useQueries } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";

const CARD_WIDTH = 219;
const SKELETON_CARD_COUNT = 4;

function RecentPhotosSkeleton() {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                <View key={`skeleton-${index}`} className="gap-[10px]" style={{ width: CARD_WIDTH }}>
                    <View className="rounded-md overflow-hidden border border-system-gray6" style={{ width: CARD_WIDTH, height: CARD_WIDTH }}>
                        <ImageSkeleton width={CARD_WIDTH} height={CARD_WIDTH} borderRadius={6} variant="rectangular" />
                    </View>
                    <View className="gap-2">
                        <Skeleton width={140} height={14} borderRadius={4} />
                        <Skeleton width={100} height={12} borderRadius={4} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

export function RecentPhotosSection() {
    const { selectedPractice } = useProfileStore();
    const { isAuthenticated } = useAuth();
    const { data: recentPhotos, isLoading: isLoadingPhotos } = useGetRecentlyPhotos(selectedPractice?.id ?? 0, !!selectedPractice?.id);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);

    // Extract unique patient IDs from recent photos
    const uniquePatientIds = useMemo(() => {
        if (!recentPhotos?.data) return [];
        const patientIds = new Set<number>();
        recentPhotos.data.forEach((photo) => {
            if (photo.patient_id) {
                patientIds.add(photo.patient_id);
            }
        });
        return Array.from(patientIds);
    }, [recentPhotos?.data]);

    // Fetch all patients using useQueries
    const patientQueries = useQueries({
        queries: uniquePatientIds.map((patientId) => ({
            queryKey: ["GetPatientById", patientId],
            queryFn: () => PatientService.getPatientById(patientId),
            enabled: isAuthenticated === true && !!patientId && !!selectedPractice?.id,
        })),
    });

    const isLoadingPatients = patientQueries.some((query) => query.isLoading);
    const isLoading = isLoadingPhotos || isLoadingPatients;

    // Create patient_id to patient name map
    const patientIdToNameMap = useMemo(() => {
        const map = new Map<number, string>();
        patientQueries.forEach((query, index) => {
            const patientId = uniquePatientIds[index];
            const patient = query.data?.data;
            if (patient && patientId) {
                map.set(patientId, patient.full_name || `${patient.first_name} ${patient.last_name}`.trim());
            }
        });
        return map;
    }, [patientQueries, uniquePatientIds]);

    // Get display URL for a photo: original_media || media || first template image (when original_media is null, e.g. template not yet composited)
    const getPhotoDisplayUrl = (photo: PatientMedia): string | undefined => {
        const url = photo.original_media?.url || photo.media?.url;
        if (url) return url;
        const firstImage = (photo as any).images?.[0]?.image;
        if (!firstImage) return undefined;
        return typeof firstImage === "string" ? firstImage : firstImage?.url;
    };

    // Extract all image URLs and create maps for patient_id and taker
    const { imageUrls, imageUrlToPatientIdMap, imageUrlToTakerMap } = useMemo(() => {
        if (!recentPhotos?.data) return { imageUrls: [], imageUrlToPatientIdMap: new Map<string, number>(), imageUrlToTakerMap: new Map<string, { first_name?: string | null; last_name?: string | null }>() };

        const urls: string[] = [];
        const patientIdMap = new Map<string, number>();
        const takerMap = new Map<string, { first_name?: string | null; last_name?: string | null }>();

        recentPhotos.data.forEach((photo) => {
            const imageUrl = getPhotoDisplayUrl(photo);
            if (imageUrl) {
                urls.push(imageUrl);
                if (photo.patient_id) {
                    patientIdMap.set(imageUrl, photo.patient_id);
                }
                if (photo.taker) {
                    takerMap.set(imageUrl, {
                        first_name: photo.taker.first_name,
                        last_name: photo.taker.last_name,
                    });
                }
            }
        });

        return { imageUrls: urls, imageUrlToPatientIdMap: patientIdMap, imageUrlToTakerMap: takerMap };
    }, [recentPhotos?.data]);

    const handleImagePress = (index: number) => {
        setSelectedImageIndex(index);
        setViewerVisible(true);
    };

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
            {isLoading ? (
                <RecentPhotosSkeleton />
            ) : recentPhotos?.data && recentPhotos.data.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                    {recentPhotos.data.map((photo: PatientMedia, index: number) => {
                        const imageUrl = getPhotoDisplayUrl(photo);
                        const takerName = photo.taker ? `${photo.taker.first_name || ""} ${photo.taker.last_name || ""}`.trim() : "Staff";
                        const patientName = photo.patient_id ? patientIdToNameMap.get(photo.patient_id) || "Patient" : "Patient";

                        return (
                            <View key={photo.id || index} className="gap-[10px]" style={{ width: CARD_WIDTH }}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        const imageIndex = imageUrls.findIndex((url) => url === imageUrl);
                                        if (imageIndex !== -1) {
                                            handleImagePress(imageIndex);
                                        }
                                    }}
                                    disabled={!imageUrl}
                                >
                                    <View className="rounded-md overflow-hidden border border-system-gray6" style={{ width: CARD_WIDTH, height: CARD_WIDTH }}>
                                        {imageUrl ? (
                                            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center bg-system-gray5">
                                                <BaseText type="Body" weight="400" color="labels.tertiary">
                                                    No image
                                                </BaseText>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                                <View>
                                    <BaseText type="Subhead" weight="600" color="labels.primary">
                                        {patientName}
                                    </BaseText>
                                    <BaseText type="Caption1" weight="400" color="labels.secondary">
                                        taken by DR.{takerName}
                                    </BaseText>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            ) : (
                <View className="items-center justify-center py-8">
                    <BaseText type="Body" weight="400" color="labels.secondary">
                        No photos yet
                    </BaseText>
                </View>
            )}
            <ImageViewerModal
                visible={viewerVisible}
                images={imageUrls}
                initialIndex={selectedImageIndex ?? 0}
                onClose={() => {
                    setViewerVisible(false);
                    setSelectedImageIndex(null);
                }}
                imageUrlToPatientIdMap={imageUrlToPatientIdMap}
                imageUrlToTakerMap={imageUrlToTakerMap}
                actions={{
                    showBookmark: false,
                    showEdit: false,
                    showArchive: false,
                    showShare: true,
                }}
            />
        </View>
    );
}
