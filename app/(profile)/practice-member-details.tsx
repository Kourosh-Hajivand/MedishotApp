import { ActivitiesList, BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { AvatarSkeleton, Skeleton } from "@/components/skeleton";
import { useGetMemberActivities, useGetPatients, useGetPracticeMember, useRemoveMember } from "@/utils/hook";
import { ActivityLog } from "@/utils/service/models/ResponseModels";
import { Button, Host, Picker } from "@expo/ui/swift-ui";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PracticeMemberDetailsParams {
    practiceId: string;
    memberId: string;
}

interface MemberData {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    activities?: any[];
    patients_count?: number;
}

// Component for Activities tab
const MemberActivities = ({ activities, isLoading }: { activities?: ActivityLog[]; isLoading?: boolean }) => {
    return (
        <View className="gap-3">
            <View className="px-4">
                <BaseText type="Headline" weight={600} color="labels.primary">
                    Recent Activities
                </BaseText>
            </View>
            <ActivitiesList activities={activities ?? []} isLoading={isLoading ?? false} emptyTitle="No recent activities" emptyDescription="" variant="flat" />
        </View>
    );
};

// Component for Patients tab
const MemberPatients = ({ memberData, practiceId, isLoadingMemberData }: { memberData?: MemberData; practiceId?: number; isLoadingMemberData?: boolean }) => {
    const { data: patients, isLoading: isPatientsLoading } = useGetPatients(practiceId || 0, { doctor_id: memberData?.id });

    // Helper function to get email as string
    const getEmailString = (email: any): string => {
        if (!email) return "";
        if (typeof email === "string") return email;
        if (Array.isArray(email) && email.length > 0) {
            // Check if it's array of objects with value property
            const firstItem = email[0];
            if (typeof firstItem === "object" && firstItem?.value) {
                return firstItem.value;
            }
            // If it's array of strings, return first one
            if (typeof firstItem === "string") {
                return firstItem;
            }
        }
        return "";
    };

    const isLoading = isPatientsLoading || isLoadingMemberData || !memberData;

    return (
        <View className="gap-3 px-4">
            <BaseText type="Headline" weight={600} color="labels.primary">
                Patients Statistics
            </BaseText>

            {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                    <View key={`patient-skeleton-${index}`} className={`flex-row items-center gap-3 ${index < 4 ? "pb-2 border-b border-system-gray5" : ""}`}>
                        <AvatarSkeleton size={34} rounded={99} />
                        <View className="flex-col gap-2">
                            <Skeleton width={120} height={16} borderRadius={4} />
                            <Skeleton width={150} height={14} borderRadius={4} />
                        </View>
                    </View>
                ))
            ) : patients?.data && patients?.data?.length > 0 ? (
                patients.data.map((patient, index) => {
                    const emailString = getEmailString(patient.email);
                    return (
                        <View key={index} className={`flex-row items-center gap-3 ${index !== patients.data.length - 1 ? "pb-2 border-b border-system-gray5" : ""}`}>
                            <Avatar size={34} rounded={99} name={`${patient.first_name} ${patient.last_name}`} imageUrl={patient.profile_image?.url} />
                            <View className="flex-col">
                                <BaseText type="Body" weight={500} color="labels.primary">
                                    {patient.first_name} {patient.last_name}
                                </BaseText>
                                {emailString && (
                                    <BaseText type="Caption1" weight={400} color="labels.secondary">
                                        {emailString}
                                    </BaseText>
                                )}
                            </View>
                        </View>
                    );
                })
            ) : (
                <View className="items-center py-8">
                    <BaseText type="Body" weight={400} color="labels.secondary">
                        No patients assigned
                    </BaseText>
                </View>
            )}
        </View>
    );
};

// Custom hook to get member data

export default function PracticeMemberDetailsScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const practiceId = params.practiceId as string;
    const memberId = params.memberId as string;

    const [pickerType, setPickerType] = useState(0);
    const { data: memberData, isLoading } = useGetPracticeMember(parseInt(practiceId || "0"), memberId || "");
    const { data: activitiesData, isLoading: isActivitiesLoading } = useGetMemberActivities(parseInt(practiceId || "0"), memberId || "", !!memberData?.data);
    const typeButton = memberData?.data?.role === "doctor" || memberData?.data?.role === "owner" ? ["Activities", "Patients"] : ["Activities"];

    const { data: patientsData } = useGetPatients(parseInt(practiceId || "0"), { doctor_id: memberId });
    const patientsCount = patientsData?.data?.length ?? 0;

    const { mutate: removeMember } = useRemoveMember(
        () => {
            router.back();
        },
        (error) => {
            Alert.alert("Error", error?.message || "An error occurred while removing the member.");
        },
    );
    const navigation = useNavigation();
    const handleRemoveMember = () => {
        if (patientsCount > 0) {
            Alert.alert(
                "Cannot Remove Doctor",
                "This doctor has patients. To delete, the doctor must either have no patients or their patients must be archived.",
                [{ text: "OK", style: "default" }],
            );
            return;
        }
        Alert.alert("Remove This Doctor", "By taking this action this doctor will be removed from your practice.", [
            {
                text: "Cancel",
                style: "cancel",
                isPreferred: true,
            },
            {
                text: "Remove",
                style: "destructive",

                onPress: () => removeMember({ practiceId: parseInt(practiceId), memberId: parseInt(memberId) }),
            },
        ]);
    };
    const isOwner = memberData?.data?.role === "owner";

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: isOwner
                ? () => null
                : () => (
                      <Host style={{ width: 90, height: 35 }}>
                          <Button disabled={isLoading} variant="bordered" role="destructive" onPress={handleRemoveMember}>
                              Remove
                          </Button>
                      </Host>
                  ),
        });
    }, [navigation, memberData, handleRemoveMember, isOwner]);
    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + 60 }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View className="gap-3">
                {isLoading ? (
                    <View className="flex-row items-center gap-2 px-4">
                        <AvatarSkeleton size={54} rounded={99} />
                        <View className="gap-2">
                            <Skeleton width={150} height={20} borderRadius={4} />
                            <Skeleton width={100} height={16} borderRadius={4} />
                        </View>
                    </View>
                ) : (
                    <View className="flex-row items-center gap-2 px-4 ">
                        <Avatar size={54} rounded={99} name={memberData?.data?.first_name && memberData?.data?.last_name ? memberData.data.first_name + " " + memberData.data.last_name : memberData?.data?.email || ""} imageUrl={memberData?.data?.image?.url} color={memberData?.data?.color} />
                        <View className="gap-0">
                            <BaseText type="Title3" weight={600} color="labels.primary">
                                {memberData?.data?.first_name && memberData?.data?.last_name ? `${memberData.data.first_name} ${memberData.data.last_name}` : memberData?.data?.email}
                            </BaseText>
                            <BaseText type="Subhead" weight={400} color="labels.secondary" className="capitalize">
                                {memberData?.data?.role}
                            </BaseText>
                        </View>
                    </View>
                )}
                <View className="pt-2 border-t border-system-gray5 ">
                    <View className="px-4 pt-4">
                        <Host matchContents style={{ flex: 1 }}>
                            <Picker
                                label="Picker Type"
                                options={typeButton}
                                selectedIndex={pickerType}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setPickerType(index);
                                }}
                                variant="segmented"
                            />
                        </Host>
                    </View>

                    <View className="mt-4">{pickerType === 0 ? <MemberActivities activities={activitiesData?.data} isLoading={isLoading || isActivitiesLoading} /> : <MemberPatients memberData={memberData?.data} practiceId={parseInt(practiceId || "0")} isLoadingMemberData={isLoading} />}</View>
                </View>
            </View>
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
        paddingBottom: 20,
    },
    content: {
        flex: 1,
        // Add your UI here
    },
});
