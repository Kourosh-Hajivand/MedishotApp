import Avatar from "@/components/avatar";
import { BaseText } from "@/components/text/BaseText";
import { useGetPatients, useGetPracticeMember, useRemoveMember } from "@/utils/hook";
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
const MemberActivities = ({ memberData }: { memberData?: MemberData }) => {
    return (
        <View className="gap-3">
            <BaseText type="Headline" weight={600} color="labels.primary">
                Recent Activities
            </BaseText>
            {memberData?.activities && memberData.activities.length > 0 ? (
                memberData.activities.slice(0, 10).map((activity, index) => (
                    <View key={index} className="flex-row items-center gap-3 p-3 bg-system-gray6 rounded-lg">
                        <View className="w-2 h-2 bg-system-blue rounded-full" />
                        <View className="flex-1">
                            <BaseText type="Body" weight={500} color="labels.primary">
                                {activity.description}
                            </BaseText>
                            <BaseText type="Caption1" weight={400} color="labels.secondary">
                                {activity.created_at}
                            </BaseText>
                        </View>
                    </View>
                ))
            ) : (
                <View className="items-center py-8">
                    <BaseText type="Body" weight={400} color="labels.secondary">
                        No recent activities
                    </BaseText>
                </View>
            )}
        </View>
    );
};

// Component for Patients tab
const MemberPatients = ({ memberData, practiceId }: { memberData?: MemberData; practiceId?: number }) => {
    const { data: patients, isLoading: isPatientsLoading } = useGetPatients(practiceId || 0, { doctor_id: memberData?.id });

    return (
        <View className="gap-3">
            <BaseText type="Headline" weight={600} color="labels.primary">
                Patients Statistics
            </BaseText>

            {patients?.data && patients?.data?.length > 0 ? (
                patients.data.map((patient, index) => (
                    <View key={index} className={`flex-row items-center gap-3 ${index !== patients.data.length - 1 ? "pb-2 border-b border-system-gray5" : ""}`}>
                        <Avatar size={34} rounded={99} name={`${patient.first_name} ${patient.last_name}`} imageUrl={patient.profile_image?.url} />
                        <View className="flex-row items-center">
                            <BaseText type="Body" weight={500} color="labels.primary">
                                {patient.first_name} {patient.last_name}
                            </BaseText>
                            <BaseText type="Caption1" weight={400} color="labels.secondary">
                                {patient.email}
                            </BaseText>
                        </View>
                    </View>
                ))
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
    const { data: memberData, isLoading, error } = useGetPracticeMember(parseInt(practiceId || "0"), memberId || "");
    const typeButton = memberData?.data?.role === "doctor" || memberData?.data?.role === "owner" ? ["Activities", "Patients"] : ["Activities"];

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
        Alert.alert("Remove This Doctor", "By taking this action this doctor will be removed from your practise.", [
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
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 90, height: 35 }}>
                    <Button disabled={isLoading} variant="bordered" role="destructive" onPress={handleRemoveMember}>
                        Remove
                    </Button>
                </Host>
            ),
        });
    }, [navigation, memberData, handleRemoveMember]);
    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + 60 }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View className="gap-3">
                <View className="flex-row items-center gap-2 px-4 ">
                    <Avatar size={54} rounded={99} name={memberData?.data?.first_name && memberData?.data?.last_name ? memberData.data.first_name + " " + memberData.data.last_name : memberData?.data?.email || ""} color={memberData?.data?.color} />
                    <View className="gap-0">
                        <BaseText type="Title3" weight={600} color="labels.primary">
                            {memberData?.data?.first_name && memberData?.data?.last_name ? `${memberData.data.first_name} ${memberData.data.last_name}` : memberData?.data?.email}
                        </BaseText>
                        <BaseText type="Subhead" weight={400} color="labels.secondary" className="capitalize">
                            {memberData?.data?.role}
                        </BaseText>
                    </View>
                </View>
                <View className="pt-2 border-t border-system-gray5 px-4">
                    <Host style={{ width: "100%", height: 38 }}>
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

                    <View className="mt-4">{pickerType === 0 ? <MemberActivities memberData={memberData?.data} /> : <MemberPatients memberData={memberData?.data} practiceId={parseInt(practiceId || "0")} />}</View>
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
