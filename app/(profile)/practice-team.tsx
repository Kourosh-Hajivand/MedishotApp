import { BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";
import { headerHeight } from "@/constants/theme";
import themeColors from "@/theme/colors";
import { useGetPracticeList, useGetPracticeMembers, useGetSubscriptionStatus, useRemoveMember, useTransferOwnership } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { TransferOwnershipDto } from "@/utils/service/models/RequestModels";
import { Button, ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { router, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PracticeTeamScreen() {
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated } = useAuth();
    const { data: practiceList } = useGetPracticeList(isAuthenticated === true);
    const { selectedPractice, setSelectedPractice } = useProfileStore();
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const { data: subscriptionData } = useGetSubscriptionStatus(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const navigation = useNavigation();

    // Set default practice if none is selected
    useEffect(() => {
        if (!selectedPractice && practiceList?.data && practiceList.data.length > 0) {
            setSelectedPractice(practiceList.data[0]);
        }
    }, [selectedPractice, practiceList?.data, setSelectedPractice]);

    // Get subscription limits
    const limits = subscriptionData?.data?.limits;
    const doctorLimit = limits?.doctor_limit ?? null;
    const staffLimit = limits?.staff_limit ?? null;
    const remainingDoctorSlots = typeof limits?.remaining_doctor_slots === "number" ? limits.remaining_doctor_slots : null;
    const remainingStaffSlots = typeof limits?.remaining_staff_slots === "number" ? limits.remaining_staff_slots : null;
    const currentDoctorCount = typeof limits?.current_doctor_count === "number" ? limits.current_doctor_count : 0;
    const currentStaffCount = typeof limits?.current_staff_count === "number" ? limits.current_staff_count : 0;
    // Owner counts as 1 doctor for display: show at least 1 when practice has an owner
    const hasOwner = practiceMembers?.data?.some((m) => m.role === "owner") ?? false;
    const displayDoctorCount = hasOwner ? Math.max(currentDoctorCount, 1) : currentDoctorCount;
    const { mutate: transferOwnership } = useTransferOwnership(
        () => {},
        (error: Error) => {
            Alert.alert("Error", error?.message || "An error occurred while transferring ownership.");
        },
    );
    const { mutate: removeMember } = useRemoveMember(
        () => {},
        (error: Error) => {
            Alert.alert("Error", error?.message || "An error occurred while removing the member.");
        },
    );
    // Owner counts as 1 doctor: when doctor_limit === 1, that slot is the owner — no extra doctor can be added
    const canAddDoctor = doctorLimit === null || (doctorLimit !== 1 && remainingDoctorSlots !== null && remainingDoctorSlots > 0);
    const canAddStaff = staffLimit === null || (remainingStaffSlots !== null && remainingStaffSlots > 0);

    const handleAddMember = () => {
        // Check if user can add more members (canAddDoctor/canAddStaff already account for owner = 1 doctor when limit is 1)

        // If both doctor and staff slots are full, show upgrade alert
        if (doctorLimit !== null && staffLimit !== null && remainingDoctorSlots !== null && remainingStaffSlots !== null && !canAddDoctor && !canAddStaff) {
            Alert.alert("Plan Limit Reached", "You have reached the maximum number of members allowed in your current plan. Please upgrade your plan to add more members.", [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Upgrade Plan",
                    onPress: () => router.push("/(profile)/subscription"),
                },
            ]);
            return;
        }

        router.push({
            pathname: "/(modals)/add-practice-member",
            params: { practiceId: selectedPractice?.id },
        });
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Host style={{ width: 105, height: 35 }}>
                    <Button systemImage="plus" onPress={handleAddMember}>
                        Member
                    </Button>
                </Host>
            ),
        });
    }, [navigation, selectedPractice?.id, doctorLimit, staffLimit, remainingDoctorSlots, remainingStaffSlots]);
    const handleRemoveMember = (practiceId: number, memberId: string | number) => {
        Alert.alert("Remove This Doctor", "By taking this action this doctor will be removed from your practise.", [
            {
                text: "Cancel",
                style: "cancel",
                isPreferred: true,
            },
            {
                text: "Remove",
                style: "destructive",

                onPress: () => removeMember({ practiceId: practiceId, memberId: memberId }),
            },
        ]);
    };
    const handleTransferOwnership = (practiceId: number, memberId: string | number) => {
        // Extract numeric ID from "user:1" format if needed
        const numericId = typeof memberId === "string" ? parseInt(memberId.split(":")[1] || memberId, 10) : memberId;
        Alert.alert("Transfer Ownership", "Are you sure you want to transfer ownership of this practice to this member?", [
            {
                text: "Cancel",
                style: "cancel",
                isPreferred: true,
            },
            {
                text: "Transfer",
                style: "default",
                onPress: () => transferOwnership({ practiceId: practiceId, data: { new_owner_id: numericId } as TransferOwnershipDto }),
            },
        ]);
    };

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top + headerHeight }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View className="gap-4  px-4 border-b border-system-gray5 pb-3">
                <Host style={{ width: "100%", height: 68 }}>
                    <ContextMenu activationMethod="longPress">
                        <ContextMenu.Items>
                            {practiceList?.data.map((practice, index) => (
                                <Switch
                                    key={index}
                                    label={practice.name}
                                    variant="switch"
                                    value={selectedPractice?.id === practice.id}
                                    onValueChange={() => {
                                        setSelectedPractice(practice);
                                    }}
                                />
                            ))}
                        </ContextMenu.Items>

                        <ContextMenu.Trigger>
                            <View className={`w-full flex-row items-center justify-between bg-system-gray6 p-1 pr-[27px] rounded-[12px]`}>
                                <View className="flex-row items-center gap-2">
                                    <Avatar size={60} rounded={8} name={selectedPractice?.name ?? ""} imageUrl={selectedPractice?.image?.url} />
                                    <View className="flex-1 ">
                                        <BaseText type="Title3" weight="500" color="system.black" lineBreakMode="tail" numberOfLines={1}>
                                            {selectedPractice?.name}
                                        </BaseText>
                                        <BaseText type="Callout" weight="400" color="labels.secondary" style={{ textTransform: "capitalize" }}>
                                            {selectedPractice?.role}
                                        </BaseText>
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <IconSymbol name="chevron.up.chevron.down" size={14} color={themeColors.labels.secondary} />
                                </View>
                            </View>
                        </ContextMenu.Trigger>
                    </ContextMenu>
                </Host>
                {/* Subscription Limits Info */}
                {(doctorLimit !== null || staffLimit !== null) && (
                    <View className="bg-system-blue/10 rounded-xl p-3 mb-2">
                        <BaseText type="Subhead" weight="600" color="system.blue" style={{ marginBottom: 4 }}>
                            Plan Limits
                        </BaseText>
                        {doctorLimit !== null && (
                            <BaseText type="Caption1" weight="400" color="labels.secondary">
                                Doctors: {String(displayDoctorCount)} / {String(doctorLimit)} {typeof remainingDoctorSlots === "number" && remainingDoctorSlots > 0 && `(${remainingDoctorSlots} remaining)`}
                            </BaseText>
                        )}
                        {staffLimit !== null && (
                            <BaseText type="Caption1" weight="400" color="labels.secondary" style={{ marginTop: 2 }}>
                                Staff: {String(currentStaffCount)} / {String(staffLimit)} {typeof remainingStaffSlots === "number" && remainingStaffSlots > 0 && `(${remainingStaffSlots} remaining)`}
                            </BaseText>
                        )}
                        {((doctorLimit !== null && typeof remainingDoctorSlots === "number" && remainingDoctorSlots === 0) || (staffLimit !== null && typeof remainingStaffSlots === "number" && remainingStaffSlots === 0)) && (
                            <TouchableOpacity onPress={() => router.push("/(profile)/subscription")} className="mt-2 bg-system-blue rounded-lg py-2 px-3">
                                <BaseText type="Subhead" weight="600" color="system.white" style={{ textAlign: "center" }}>
                                    Upgrade Plan
                                </BaseText>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
            <View className="pt-0 px-4 ">
                {practiceMembers?.data?.map((member, index) => {
                    const isOwner = member.role === "owner";
                    const rowContent = (
                        <TouchableOpacity
                            disabled={member.status !== "active"}
                            className="flex-row items-center justify-between pl-1 py-2 pr-4 bg-white disabled:opacity-60"
                            onPress={() => {
                                if (member.status === "active") {
                                    router.push({
                                        pathname: "/practice-member-details",
                                        params: {
                                            practiceId: selectedPractice?.id,
                                            memberId: member.id,
                                        },
                                    });
                                }
                            }}
                        >
                            <View className="flex-row items-center gap-2">
                                <Avatar size={54} imageUrl={member.image?.url} rounded={99} name={member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email} color={member.color} haveRing />
                                <View>
                                    <BaseText type="Callout" weight="500" color="system.black">
                                        {member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email}
                                    </BaseText>
                                    <BaseText type="Footnote" weight="400" color="labels.secondary" className="capitalize">
                                        {member.role}
                                    </BaseText>
                                </View>
                            </View>
                            <IconSymbol name="chevron.right" size={14} color={themeColors.labels.secondary} />
                        </TouchableOpacity>
                    );
                    const isLastItem = index === (practiceMembers?.data?.length ?? 0) - 1;
                    return (
                        <React.Fragment key={`member-${member.id}`}>
                            <Host style={{ width: "100%", height: 68 }}>
                                {isOwner ? (
                                    rowContent
                                ) : (
                                    <ContextMenu activationMethod="longPress">
                                        <ContextMenu.Items>
                                            <Button
                                                systemImage="pencil.and.scribble"
                                                onPress={() =>
                                                    router.push({
                                                        pathname: "/(modals)/add-practice-member",
                                                        params: {
                                                            practiceId: selectedPractice?.id,
                                                            mode: "edit",
                                                            member: JSON.stringify(member),
                                                        },
                                                    })
                                                }
                                            >
                                                Update Member Role
                                            </Button>
                                            <Button systemImage="trash" role="destructive" onPress={() => handleRemoveMember(selectedPractice?.id ?? 0, member.id)}>
                                                Remove
                                            </Button>
                                        </ContextMenu.Items>
                                        <ContextMenu.Trigger>{rowContent}</ContextMenu.Trigger>
                                    </ContextMenu>
                                )}
                            </Host>
                            {!isLastItem && <View style={{ height: 1, backgroundColor: themeColors.system.gray5, marginLeft: 60 }} />}
                        </React.Fragment>
                    );
                })}
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
        paddingBottom: 16,
        gap: 6,
    },
    description: {
        marginTop: 8,
    },
});
